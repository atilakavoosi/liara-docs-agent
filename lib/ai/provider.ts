import { createOpenAI } from "@ai-sdk/openai";

/**
 * اتصال به ارائه‌دهنده‌ی هوش مصنوعی.
 *
 * ارائه‌دهنده: AvalAI (`https://api.avalai.ir/v1`)، یک gateway سازگار با
 * OpenAI. به‌جای سرویس AI خود لیارا انتخاب شد چون کلید از قبل در دسترس
 * بود؛ دیپلوی همچنان کامل روی زیرساخت PaaS لیارا انجام می‌شه، فقط
 * ارائه‌دهنده‌ی مدل فرق می‌کنه. (ADR-006). چون کد از یک provider عمومی
 * سازگار با OpenAI استفاده می‌کنه، سوییچ به سرویس AI لیارا فقط نیاز به
 * عوض کردن `BASE_URL`/`AI_API_KEY` داره، نه تغییر کد.
 *
 * ⚠️ نکته‌ی مهم نسخه‌ای: از AI SDK v5 به بعد، فراخوانی مستقیم provider
 * (یعنی `provider(modelId)`) به **Responses API** اوپن‌ای‌آی می‌ره، نه به
 * `/chat/completions`. سرویس‌های سازگار با OpenAI معمولاً فقط
 * `/chat/completions` رو پیاده کردن. پس همه‌جا صریح `.chat()` صدا می‌زنیم.
 * (ADR-005)
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `متغیر محیطی ${name} تنظیم نشده. برای توسعه‌ی محلی .env.local رو پر کن ` +
        `و روی لیارا از بخش متغیرهای محیطی برنامه واردش کن.`,
    );
  }
  return value;
}

let provider: ReturnType<typeof createOpenAI> | null = null;

function getProvider() {
  provider ??= createOpenAI({
    baseURL: requireEnv("BASE_URL"),
    apiKey: requireEnv("AI_API_KEY"),
  });
  return provider;
}

/** شناسه‌ی مدل‌ها از env خونده می‌شن — لیست واقعی به پلن سرویس بستگی داره. */
export const MODEL_IDS = {
  /** مدل ارزان: مسیریابی intent، بازنویسی کوئری، rerank، خلاصه‌سازی */
  fast: () => process.env.MODEL_FAST ?? "gpt-5.6-luna",
  /** مدل قوی: فقط تولید پاسخ نهایی */
  smart: () => process.env.MODEL_SMART ?? "gpt-5.6-terra",
  embed: () => process.env.MODEL_EMBED ?? "text-embedding-3-small",
} as const;

/**
 * مدل ارزان. برای کارهای پرتکرار و کم‌ارزش استفاده می‌شه تا هزینه‌ی
 * مدل قوی فقط یک‌بار در هر مکالمه پرداخت بشه. (معیار بهینه‌سازی هزینه)
 */
export const fastModel = () => getProvider().chat(MODEL_IDS.fast());

/** مدل قوی، فقط برای پاسخ نهاییِ کاربر. */
export const smartModel = () => getProvider().chat(MODEL_IDS.smart());

/** مدل بردارسازی، برای کوئری کاربر و کش معنایی. */
export const embeddingModel = () => getProvider().embeddingModel(MODEL_IDS.embed());

/** آیا سرویس AI پیکربندی شده؟ برای /api/health، بدون افشای مقدار. */
export const isAiConfigured = () =>
  Boolean(process.env.BASE_URL && process.env.AI_API_KEY);
