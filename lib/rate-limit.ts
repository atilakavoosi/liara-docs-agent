/**
 * محدودسازی نرخ درخواست، پنجره‌ی کشویی، درون‌حافظه.
 *
 * برای هکاتون کافیه؛ چون فقط یک اینستنس اجرا می‌شه. اگه بعداً به چند
 * اینستنس مقیاس پیدا کرد، فقط این فایل با یک بک‌اند Redis عوض می‌شه —
 * بقیه‌ی کد (`app/api/chat/route.ts`) به این جزئیات وابسته نیست.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

// جلوگیری از نشت حافظه در پروسه‌ی طولانی‌مدت: هر چند دقیقه یک‌بار
// bucketهای خالی پاک می‌شن.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}, 5 * 60_000).unref();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** بررسی و ثبت یک درخواست برای کلید داده‌شده (معمولاً IP). */
export function checkRateLimit(key: string, limitPerMinute: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= limitPerMinute) {
    const oldest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + WINDOW_MS - now) / 1000),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: limitPerMinute - bucket.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * استخراج یک شناسه‌ی معقول برای rate limit از هدرهای درخواست.
 * لیارا و اکثر پلتفرم‌های PaaS پشت یک reverse proxy هستن که
 * `x-forwarded-for` رو ست می‌کنه.
 */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
