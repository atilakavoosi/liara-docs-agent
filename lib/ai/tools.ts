import { tool } from "ai";
import { z } from "zod";
import { hybridSearch } from "../retrieval/search";

/**
 * تعریف ابزارهای agentic. هر تولی که `execute` نداره (مثل
 * `askClarification`) به‌عمد به‌شکل client tool طراحی شده: مدل تولش رو
 * صدا می‌زنه، جریان استریم متوقف می‌شه، UI سؤال/گزینه‌ها رو رندر می‌کنه،
 * و جواب کاربر به‌شکل یک پیام معمولی به مکالمه اضافه می‌شه — نه یک
 * round-trip سروری جدا.
 */

const KNOWN_SERVICES = [
  "paas", "ai", "dbaas", "iaas", "one-click-apps",
  "email-server", "object-storage", "dns-management-system", "references",
] as const;

const searchDocs = tool({
  description:
    "جستجو در مستندات لیارا. قبل از هر ادعای فنی حتماً صدا زده بشه. " +
    "می‌تونی با service/platform نتایج رو محدود کنی اگه از مکالمه فهمیدی " +
    "کاربر روی چه پلتفرمی کار می‌کنه.",
  inputSchema: z.object({
    query: z.string().describe("عبارت جستجو، ترجیحاً به فارسی و شامل کلمات کلیدی فنی دقیق"),
    service: z.enum(KNOWN_SERVICES).nullable().optional()
      .describe("محدود کردن به یک سرویس خاص، در صورت مشخص بودن"),
    platform: z.string().nullable().optional()
      .describe("محدود کردن به یک پلتفرم خاص مثل nextjs، laravel، django"),
  }),
  execute: async ({ query, service, platform }) => {
    const hits = await hybridSearch(query, { service, platform, topK: 6 });
    return {
      results: hits.map((h) => ({
        title: h.chunk.title,
        section: h.chunk.headingPath,
        url: h.chunk.sourceUrl,
        content: h.chunk.text,
      })),
    };
  },
});

const askClarification = tool({
  description:
    "وقتی سؤال کاربر برای جواب دقیق مبهمه، این رو صدا بزن به‌جای حدس زدن. " +
    "بدون execute — UI این رو به‌شکل سؤال با گزینه‌های قابل‌کلیک نشون می‌ده.",
  inputSchema: z.object({
    question: z.string().describe("سؤال تکمیلی، کوتاه و مشخص"),
    options: z.array(z.string()).min(2).max(5)
      .describe("گزینه‌های محتمل که کاربر می‌تونه انتخاب کنه"),
  }),
});

/**
 * کدهای خطای رایج Node/Next که شناخته می‌شن، برای اینکه کوئری جستجو
 * دقیق‌تر از پیست کردن کل لاگ باشه.
 */
const ERROR_CODE_RE = /\b(E[A-Z]{4,}|ECONNRESET|ENOTFOUND|EADDRINUSE|ETIMEDOUT|ENOENT)\b/;

const diagnoseError = tool({
  description:
    "وقتی کاربر یک پیام خطا، لاگ build، یا stack trace پیست کرده، به‌جای " +
    "searchDocs معمولی این رو صدا بزن — برای تشخیص کد خطا بهینه شده.",
  inputSchema: z.object({
    errorText: z.string().describe("متن خطا یا لاگ، همون‌طور که کاربر پیست کرده"),
    platform: z.string().nullable().optional(),
  }),
  execute: async ({ errorText, platform }) => {
    // متن طولانی رو برای کوئری کوتاه می‌کنیم — هم هزینه‌ی embedding کمتر
    // می‌شه هم سیگنال BM25 تمیزتره
    const trimmed = errorText.slice(0, 600);
    const codeMatch = trimmed.match(ERROR_CODE_RE);
    const query = codeMatch ? `خطای ${codeMatch[0]} ${trimmed.slice(0, 200)}` : trimmed;

    const hits = await hybridSearch(query, { platform, topK: 5 });
    return {
      detectedErrorCode: codeMatch?.[0] ?? null,
      results: hits.map((h) => ({
        title: h.chunk.title,
        url: h.chunk.sourceUrl,
        content: h.chunk.text,
      })),
    };
  },
});

const PLATFORM_DEFAULTS: Record<string, { port?: number; extra?: Record<string, unknown> }> = {
  next: { extra: { next: { nodeVersion: "22" } } },
  node: { port: 3000 },
  laravel: {},
  php: {},
  python: { port: 8000 },
  django: {},
  flask: { port: 5000 },
  docker: {},
};

const generateConfig = tool({
  description:
    "ساخت محتوای فایل liara.json برای دیپلوی، متناسب با پلتفرم و نیاز " +
    "کاربر. خروجی رو مستقیم داخل بلوک کد به کاربر نشون بده تا کپی کنه.",
  inputSchema: z.object({
    appName: z.string().describe("نام اپ در کنسول لیارا"),
    platform: z.enum(["next", "node", "laravel", "php", "python", "django", "flask", "docker"]),
    port: z.number().int().positive().nullable().optional(),
    diskPath: z.string().nullable().optional()
      .describe("مسیر داخل کانتینر برای دیسک پایدار، مثل uploads یا database/sqlite"),
  }),
  execute: async ({ appName, platform, port, diskPath }) => {
    const defaults = PLATFORM_DEFAULTS[platform] ?? {};
    const config: Record<string, unknown> = {
      platform,
      app: appName,
      ...(port ?? defaults.port ? { port: port ?? defaults.port } : {}),
      ...(defaults.extra ?? {}),
    };
    if (diskPath) {
      config.disks = [{ name: "storage", mountTo: diskPath }];
    }
    return { fileName: "liara.json", content: JSON.stringify(config, null, 2) };
  },
});

const buildRunbook = tool({
  description:
    "برای مسیرهای چندمرحله‌ای (مثلاً راه‌اندازی کامل یک سرویس از صفر تا " +
    "دیپلوی) به‌جای یک متن بلند، مراحل رو به‌شکل چک‌لیست بساز.",
  inputSchema: z.object({
    title: z.string(),
    steps: z.array(z.object({
      title: z.string(),
      detail: z.string(),
      sourceUrl: z.string().nullable().optional(),
    })).min(2).max(12),
  }),
  execute: async (input) => input,
});

const draftSupportTicket = tool({
  description:
    "وقتی مستندات موجود جواب سؤال کاربر رو نداره، به‌جای حدس زدن یا " +
    "توهم زدن، این رو صدا بزن تا یک پیش‌نویس تیکت پشتیبانی برای کاربر " +
    "آماده بشه. این فقط پیش‌نویس می‌سازه، تیکت واقعی ثبت نمی‌کنه — کاربر " +
    "خودش باید متن رو به پشتیبانی لیارا بفرسته.",
  inputSchema: z.object({
    summary: z.string().describe("خلاصه‌ی مشکل کاربر"),
    category: z.string().describe("دسته‌بندی کوتاه، مثل «سرویس AI» یا «دیتابیس»"),
    docsChecked: z.array(z.string()).describe("URLهایی که بررسی شدن ولی جواب رو نداشتن"),
  }),
  execute: async ({ summary, category, docsChecked }) => ({
    draft: {
      subject: `[${category}] ${summary.slice(0, 80)}`,
      body:
        `${summary}\n\n` +
        `مستنداتی که بررسی شد ولی جواب دقیق این مورد رو نداشت:\n` +
        docsChecked.map((u) => `- ${u}`).join("\n"),
    },
  }),
});

export const tools = {
  searchDocs,
  askClarification,
  diagnoseError,
  generateConfig,
  buildRunbook,
  draftSupportTicket,
};
