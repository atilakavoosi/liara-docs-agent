import type { DocChunk, RetrievalHit } from "../types";

/**
 * ادغام رتبه‌ها با Reciprocal Rank Fusion.
 *
 * چرا RRF و نه جمع وزن‌دار امتیازها: امتیاز BM25 بی‌کران و وابسته به
 * کورپوسه، ولی شباهت کسینوسی همیشه در بازه‌ی [-۱,۱] ـه. جمع کردن مستقیم
 * این دو یعنی مقیاس‌بندی دلبخواه که باید دستی کالیبره بشه. RRF فقط به
 * *رتبه* نگاه می‌کنه، پس نیازی به هم‌مقیاس کردن نداره و در عمل پایدارتره.
 */

const RRF_K = 60; // ثابت استاندارد؛ اثر رتبه‌های خیلی بالا رو ملایم می‌کنه

export interface FuseInput {
  bm25: Array<[number, number]>;
  vector: Array<[number, number]>;
  /** وزن نسبی هر سیگنال. پیش‌فرض برابر. */
  weights?: { bm25: number; vector: number };
}

export function reciprocalRankFusion(
  { bm25, vector, weights = { bm25: 1, vector: 1 } }: FuseInput,
  chunks: DocChunk[],
  topK = 20,
): RetrievalHit[] {
  const fused = new Map<number, { score: number; bm25Rank?: number; vectorRank?: number }>();

  const add = (
    ranked: Array<[number, number]>,
    weight: number,
    key: "bm25Rank" | "vectorRank",
  ) => {
    ranked.forEach(([docId, ], i) => {
      const rank = i + 1;
      const entry = fused.get(docId) ?? { score: 0 };
      entry.score += weight / (RRF_K + rank);
      entry[key] = rank;
      fused.set(docId, entry);
    });
  };

  add(bm25, weights.bm25, "bm25Rank");
  add(vector, weights.vector, "vectorRank");

  const ranked = [...fused.entries()].sort((a, b) => b[1].score - a[1].score);

  // تنوع منبع: یک سند طولانی می‌تونه چند تکه‌ی هم‌رتبه در نتایج داشته
  // باشه و کل topK رو با یک صفحه پر کنه (اندازه‌گیری شد: در آزمایش،
  // ۵ از ۵ نتیجه‌ی اول همه از یک سند بودن). حداکثر ۲ تکه از هر sourceUrl
  // مجاز می‌شه تا جواب از منابع مختلف تغذیه بشه.
  const perSource = new Map<string, number>();
  const diversified: typeof ranked = [];
  for (const entry of ranked) {
    const url = chunks[entry[0]].sourceUrl;
    const count = perSource.get(url) ?? 0;
    if (count >= 2) continue;
    perSource.set(url, count + 1);
    diversified.push(entry);
    if (diversified.length >= topK) break;
  }

  return diversified.map(([docId, v]) => ({
    chunk: chunks[docId],
    score: v.score,
    signals: { bm25Rank: v.bm25Rank, vectorRank: v.vectorRank },
  }));
}

/**
 * تقویت متادیتایی بر اساس پروفایل کاربر.
 *
 * اگه کاربر گفته روی Laravel کار می‌کنه، سند «اتصال به PostgreSQL در
 * Laravel» باید بالاتر از نسخه‌ی Django همون سند بیاد. این تابع بعد از
 * ادغام و قبل از rerank اجرا می‌شه.
 */
export function applyProfileBoost(
  hits: RetrievalHit[],
  profile: { platform?: string | null; service?: string | null },
): RetrievalHit[] {
  if (!profile.platform && !profile.service) return hits;

  const boosted = hits.map((hit) => {
    let multiplier = 1;
    if (profile.platform && hit.chunk.platform === profile.platform) multiplier += 0.35;
    if (profile.service && hit.chunk.service === profile.service) multiplier += 0.2;
    return { ...hit, score: hit.score * multiplier };
  });

  return boosted.sort((a, b) => b.score - a.score);
}
