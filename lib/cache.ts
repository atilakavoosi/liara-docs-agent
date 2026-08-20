import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";

/**
 * کش معنایی برای سؤال‌های اول مکالمه (سؤال‌های رایج/FAQ-مانند).
 *
 * چرا فقط تِرن اول: کش‌کردن یک مکالمه‌ی چندمرحله‌ای که وابسته به تاریخچه‌ست
 * درست نیست — همون سؤال با تاریخچه‌ی متفاوت باید جواب متفاوت بگیره. اما
 * سؤال اول («چطور روی Next.js دیپلوی کنم؟») بین کاربرهای مختلف زیاد تکرار
 * می‌شه و مستقل از تاریخچه‌ست، پس امن برای کش‌شدنه.
 *
 * آستانه‌ی ۰.۹۷ از روی اندازه‌گیری واقعی (نه حدس) انتخاب شده — ببین
 * ADR-008 در docs/DECISIONS.md. خلاصه: با `text-embedding-3-small` روی
 * سؤال‌های کوتاه فارسی، بین «هم‌معنی با کلمات متفاوت» (مثلاً «قیمت» در
 * برابر «هزینه»، cosine≈۰.۸۴) و «سؤال کاملاً متفاوت اما هم‌حوزه» (مثلاً
 * پلن پایه در برابر پلن حرفه‌ای، cosine≈۰.۸۸؛ یا ECONNREFUSED در برابر
 * ECONNRESET، cosine≈۰.۸۷) هیچ فاصله‌ی امنی وجود نداره — بازه‌هاشون قاطی
 * می‌شن. یعنی کش معنایی واقعی (paraphrase-level) با این مدل embedding
 * غیرممکنه بدون ریسک برگردوندن جواب غلط. اما تکرار تقریباً عین‌همون
 * رشته (کاربرهای مختلف که روی همون سؤال پیشنهادی در EmptyState کلیک
 * می‌کنن، یا فاصله/علامت اضافه) cosine بین ۰.۹۷ تا ۰.۹۹۵ می‌ده — کاملاً
 * جدا از خوشه‌ی خطرناک. پس این کش عمداً محدود به «تکرار تقریباً دقیق»ـه،
 * نه شباهت معنایی واقعی؛ کم‌فایده‌تر از تصور اولیه ولی امن.
 */

const MAX_ENTRIES = 200;
const SIMILARITY_THRESHOLD = 0.97;

interface CacheEntry {
  query: string;
  embedding: Float32Array;
  responseMessage: UIMessage;
  createdAt: number;
  hits: number;
}

const entries: CacheEntry[] = [];
let totalLookups = 0;
let totalHits = 0;

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function lookupSemanticCache(embedding: Float32Array): CacheEntry | null {
  totalLookups++;
  let best: CacheEntry | null = null;
  let bestScore = 0;
  for (const entry of entries) {
    const score = cosineSimilarity(embedding, entry.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  if (best && bestScore >= SIMILARITY_THRESHOLD) {
    best.hits++;
    totalHits++;
    return best;
  }
  return null;
}

export function storeSemanticCache(
  query: string,
  embedding: Float32Array,
  responseMessage: UIMessage,
): void {
  entries.push({ query, embedding, responseMessage, createdAt: Date.now(), hits: 0 });
  if (entries.length > MAX_ENTRIES) entries.shift();
}

export function getCacheStats() {
  return {
    entries: entries.length,
    totalLookups,
    totalHits,
    hitRate: totalLookups > 0 ? totalHits / totalLookups : 0,
    topEntries: [...entries]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10)
      .map((e) => ({ query: e.query, hits: e.hits, createdAt: e.createdAt })),
  };
}

/**
 * پیام کش‌شده رو با همون پروتکل UI Message Stream خود AI SDK بازپخش می‌کنه
 * — نه یک فرمت دست‌ساز — تا کلاینت (`useChat`) هیچ فرقی با یک پاسخ زنده
 * حس نکنه: همون کارت‌های ابزار، همون بج‌های استناد، همون پنل منابع.
 */
export function replaySemanticCache(entry: CacheEntry): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }: { writer: UIMessageStreamWriter }) => {
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });

      for (const part of entry.responseMessage.parts) {
        if (part.type === "text" && part.text) {
          const id = crypto.randomUUID();
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: part.text });
          writer.write({ type: "text-end", id });
        } else if (part.type.startsWith("tool-") && "toolCallId" in part) {
          const toolName = part.type.slice("tool-".length);
          const toolPart = part as unknown as {
            toolCallId: string;
            input: unknown;
            output?: unknown;
            state: string;
          };
          writer.write({
            type: "tool-input-available",
            toolCallId: toolPart.toolCallId,
            toolName,
            input: toolPart.input,
          });
          if (toolPart.state === "output-available") {
            writer.write({
              type: "tool-output-available",
              toolCallId: toolPart.toolCallId,
              output: toolPart.output,
            });
          }
        }
      }

      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
