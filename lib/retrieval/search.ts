import { embed } from "ai";
import { embeddingModel } from "../ai/provider";
import { getIndex } from "../index-store";
import type { RetrievalHit } from "../types";
import { reciprocalRankFusion, applyProfileBoost } from "./fuse";

export interface SearchOptions {
  /** فیلتر اختیاری روی سرویس (paas/ai/dbaas/...) — از intent یا پروفایل کاربر میاد */
  service?: string | null;
  /** فیلتر اختیاری روی پلتفرم (nextjs/laravel/...) */
  platform?: string | null;
  topK?: number;
}

/**
 * خط لوله‌ی کامل بازیابی هیبرید: BM25 + برداری → RRF → تقویت پروفایل.
 *
 * نقطه‌ی ورود مشترک برای tool `searchDocs` و `scripts/eval.ts`، تا منطق
 * بازیابی یک‌بار نوشته بشه و eval واقعاً همون مسیری رو بسنجه که کاربر
 * نهایی می‌بینه.
 */
export async function hybridSearch(
  query: string,
  options: SearchOptions = {},
): Promise<RetrievalHit[]> {
  const { chunks, bm25, vectors } = await getIndex();
  const topK = options.topK ?? 8;

  const bm25Hits = bm25.search(query, 30);

  let vectorHits: Array<[number, number]> = [];
  if (vectors) {
    const { embedding } = await embed({ model: embeddingModel(), value: query });
    vectorHits = vectors.search(embedding, 30);
  }

  let hits = reciprocalRankFusion({ bm25: bm25Hits, vector: vectorHits }, chunks, 30);

  if (options.service || options.platform) {
    hits = applyProfileBoost(hits, { service: options.service, platform: options.platform });
  }

  return hits.slice(0, topK);
}
