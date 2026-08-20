/**
 * ثبت درون‌حافظه‌ی مصرف هر درخواست چت — برای `/admin`.
 *
 * تخمین هزینه عمداً «فرضی» نیست: تا وقتی قیمت واقعی هر مدل روی AvalAI در
 * env تنظیم نشه، هزینه‌ای نمایش داده نمی‌شه (به‌جای یک عدد ساختگی). این
 * تصمیم آگاهانه‌ست چون هر عددی که نتونیم منبعش رو نشون بدیم، گمراه‌کننده‌ست.
 */

export interface UsageRecord {
  requestId: string;
  ts: number;
  route: string;
  model: string | null;
  tokensIn: number;
  tokensOut: number;
  cacheHit: boolean;
  durationMs: number;
}

const MAX_RECORDS = 500;
const records: UsageRecord[] = [];

export function recordUsage(entry: UsageRecord): void {
  records.push(entry);
  if (records.length > MAX_RECORDS) records.shift();
}

function priceFor(model: string | null): { inPer1M: number; outPer1M: number } | null {
  if (!model) return null;
  const prefix = model.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const inPer1M = Number(process.env[`PRICE_${prefix}_IN_PER_1M`]);
  const outPer1M = Number(process.env[`PRICE_${prefix}_OUT_PER_1M`]);
  if (!Number.isFinite(inPer1M) || !Number.isFinite(outPer1M)) return null;
  return { inPer1M, outPer1M };
}

export function getUsageSummary() {
  const totalRequests = records.length;
  const cacheHits = records.filter((r) => r.cacheHit).length;
  const tokensIn = records.reduce((sum, r) => sum + r.tokensIn, 0);
  const tokensOut = records.reduce((sum, r) => sum + r.tokensOut, 0);
  const avgDurationMs =
    totalRequests > 0 ? records.reduce((sum, r) => sum + r.durationMs, 0) / totalRequests : 0;

  let estimatedCost = 0;
  let costCurrency: string | null = null;
  let costIsEstimate = false;
  for (const r of records) {
    const price = priceFor(r.model);
    if (!price) continue;
    costIsEstimate = true;
    costCurrency = process.env.PRICE_CURRENCY ?? "؟";
    estimatedCost += (r.tokensIn / 1_000_000) * price.inPer1M + (r.tokensOut / 1_000_000) * price.outPer1M;
  }

  return {
    totalRequests,
    cacheHits,
    cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
    tokensIn,
    tokensOut,
    avgDurationMs: Math.round(avgDurationMs),
    estimatedCost: costIsEstimate ? estimatedCost : null,
    costCurrency,
    recent: [...records].reverse().slice(0, 30),
  };
}
