import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { smartModel } from "../../../lib/ai/provider";
import { SYSTEM_PROMPT } from "../../../lib/ai/prompts";
import { tools } from "../../../lib/ai/tools";
import { checkRateLimit, getClientKey } from "../../../lib/rate-limit";
import { logger, newRequestId } from "../../../lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.any()).max(60, "مکالمه خیلی طولانی شده؛ یک گفتگوی جدید شروع کن."),
  profile: z
    .object({
      platform: z.string().nullable().optional(),
      service: z.string().nullable().optional(),
    })
    .optional(),
});

const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN ?? 12);
const MAX_TOKENS = Number(process.env.MAX_TOKENS_PER_REQUEST ?? 4000);

export async function POST(req: Request) {
  const requestId = newRequestId();
  const startedAt = Date.now();

  const clientKey = getClientKey(req.headers);
  const rl = checkRateLimit(clientKey, RATE_LIMIT);
  if (!rl.allowed) {
    logger.warn("rate limit exceeded", { requestId, route: "chat", clientKey });
    return Response.json(
      {
        error: "تعداد درخواست‌هات از حد مجاز گذشته. کمی صبر کن و دوباره امتحان کن.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    parsed = bodySchema.parse(json);
  } catch (err) {
    logger.warn("invalid request body", { requestId, route: "chat" });
    return Response.json({ error: "قالب درخواست نامعتبره." }, { status: 400 });
  }

  const { messages, profile } = parsed;

  const systemPrompt = profile?.platform || profile?.service
    ? `${SYSTEM_PROMPT}\n\n## پروفایل شناخته‌شده‌ی کاربر در این مکالمه\n` +
      `${profile.platform ? `پلتفرم: ${profile.platform}\n` : ""}` +
      `${profile.service ? `سرویس مورد استفاده: ${profile.service}\n` : ""}` +
      `این اطلاعات رو در جستجوها و پاسخ‌ها درنظر بگیر، بدون این‌که دوباره بپرسیش.`
    : SYSTEM_PROMPT;

  try {
    const modelMessages = await convertToModelMessages(messages as UIMessage[], { tools });

    const result = streamText({
      model: smartModel(),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      // حداکثر ۶ گام: جستجو → (احتمالاً جستجوی دوم) → تشخیص خطا/تولید
      // کانفیگ → پاسخ نهایی. سقفی که هم مسیرهای agentic واقعی رو جا می‌ده
      // هم جلوی حلقه‌ی بی‌پایان و هزینه‌ی کنترل‌نشده رو می‌گیره.
      stopWhen: stepCountIs(6),
      maxOutputTokens: MAX_TOKENS,
      onFinish: ({ totalUsage, steps }) => {
        logger.info("chat completed", {
          requestId,
          route: "chat",
          durationMs: Date.now() - startedAt,
          tokensIn: totalUsage.inputTokens,
          tokensOut: totalUsage.outputTokens,
          steps: steps.length,
          toolCalls: steps.flatMap((s) => s.toolCalls.map((t) => t.toolName)),
        });
      },
      onError: ({ error }) => {
        logger.error("stream error", {
          requestId,
          route: "chat",
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });

    return result.toUIMessageStreamResponse({
      onError: () =>
        "یه مشکل موقت پیش اومد. دوباره امتحان کن؛ اگه ادامه داشت، بعداً برگرد.",
    });
  } catch (err) {
    // خطای سطح بالا (مثلاً کلید API غلط یا سرویس در دسترس نیست) — هیچ‌وقت
    // پیام خام err رو به کلاینت نده، فقط لاگ کن.
    logger.error("chat route failed", {
      requestId,
      route: "chat",
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      { error: "سرویس هوش مصنوعی موقتاً در دسترس نیست. چند لحظه دیگه امتحان کن." },
      { status: 502 },
    );
  }
}
