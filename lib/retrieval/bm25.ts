import { tokenize, tokenizeQuery } from "./normalize-fa";
import type { DocChunk } from "../types";

/**
 * BM25 روی ایندکس معکوس در حافظه.
 *
 * چرا در کنار جستجوی برداری لازمه: کاربر مستندات فنی دنبال رشته‌های دقیق
 * می‌گرده — `ECONNRESET`، `nodeVersion`، `liara.json`. شباهت معنایی این‌ها
 * رو گم می‌کنه چون بردارها روی مفهوم کار می‌کنن نه روی تطابق واژه. BM25
 * دقیقاً همین شکاف رو پر می‌کنه. (ADR-004)
 */

const K1 = 1.2;
const B = 0.75;

export class BM25Index {
  /** term → (docId → تعداد تکرار) */
  private postings = new Map<string, Map<number, number>>();
  private docLengths: number[] = [];
  private avgDocLength = 0;
  private docCount = 0;

  constructor(chunks: DocChunk[]) {
    this.docCount = chunks.length;
    this.docLengths = new Array(chunks.length).fill(0);

    for (const chunk of chunks) {
      const terms = tokenize(chunk.text);
      this.docLengths[chunk.id] = terms.length;

      const counts = new Map<string, number>();
      for (const t of terms) counts.set(t, (counts.get(t) ?? 0) + 1);

      for (const [term, tf] of counts) {
        let p = this.postings.get(term);
        if (!p) {
          p = new Map();
          this.postings.set(term, p);
        }
        p.set(chunk.id, tf);
      }
    }

    const total = this.docLengths.reduce((a, b) => a + b, 0);
    this.avgDocLength = total / Math.max(1, this.docCount);
  }

  get termCount(): number {
    return this.postings.size;
  }

  /** برمی‌گردونه: آرایه‌ی [docId, score] مرتب‌شده‌ی نزولی، حداکثر topK تا. */
  search(query: string, topK = 50): Array<[number, number]> {
    const queryTerms = tokenizeQuery(query);
    if (!queryTerms.length) return [];

    const scores = new Map<number, number>();

    for (const term of queryTerms) {
      const posting = this.postings.get(term);
      if (!posting) continue;

      const df = posting.size;
      // IDF نسخه‌ی هموارشده — همیشه مثبت می‌مونه تا ترم‌های خیلی پرتکرار
      // امتیاز منفی تولید نکنن
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));

      for (const [docId, tf] of posting) {
        const norm = 1 - B + (B * this.docLengths[docId]) / this.avgDocLength;
        const score = idf * ((tf * (K1 + 1)) / (tf + K1 * norm));
        scores.set(docId, (scores.get(docId) ?? 0) + score);
      }
    }

    return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);
  }
}
