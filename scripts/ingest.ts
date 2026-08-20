/**
 * ساخت ایندکس بازیابی از کورپوس کش‌شده‌ی مستندات لیارا.
 *
 *   node scripts/fetch-docs.mjs             # مرحله ۱ — دانلود (بدون نیاز به کلید)
 *   npx tsx scripts/ingest.ts --chunks-only # مرحله ۲ الف — فقط تکه‌بندی
 *   npx tsx scripts/ingest.ts               # مرحله ۲ ب — تکه‌بندی + بردارسازی
 *
 * خروجی: data/chunks.json، data/embeddings.bin، data/manifest.json
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import type { DocChunk, IndexManifest } from "../lib/types";

const CACHE = path.join(process.cwd(), ".cache", "docs");
const OUT = path.join(process.cwd(), "data");

/** هدف ~۶۰۰ توکن. برای متن فارسی تقریباً ۳ کاراکتر به ازای هر توکن. */
const TARGET_CHARS = 1800;
const MIN_CHARS = 220;
const MAX_CHARS = 3000;

const estimateTokens = (s: string) => Math.ceil(s.length / 3);

interface ParsedDoc {
  sourceUrl: string;
  title: string;
  service: string;
  platform: string | null;
  body: string;
}

/** پاک‌سازی یک فایل کش‌شده و استخراج متادیتا. */
function parseDoc(raw: string): ParsedDoc | null {
  const srcMatch = raw.match(/^<!--source:(.+?)-->\n/);
  if (!srcMatch) return null;
  const llmsUrl = srcMatch[1];
  let body = raw.slice(srcMatch[0].length).replace(/^﻿/, "");

  // خط `Original link:` آدرس قابل‌مشاهده‌ی صفحه‌ست — مبنای citation ما
  const linkMatch = body.match(/^Original link:\s*(\S+)\s*$/m);
  const sourceUrl = linkMatch
    ? linkMatch[1]
    : llmsUrl.replace("/llms/", "/").replace(/\.md$/, "/");
  if (linkMatch) body = body.replace(linkMatch[0], "");

  // بویلرپلیت انتهایی که در هر ۱۱۴۲ فایل تکرار شده — نویز خالص
  body = body.replace(/\n#+\s*all links[\s\S]*$/i, "");

  // تصاویر base64 جاسازی‌شده. در ۳ فایل هستن ولی یکی‌شون به‌تنهایی
  // ۴۸ هزار کاراکتره — هم هزینه‌ی بردارسازی رو هدر می‌ده هم بازیابی رو آلوده
  // می‌کنه. با یک نگه‌دارنده‌ی خوانا جایگزین می‌شن.
  body = body.replace(/data:[a-z0-9/+.-]+;base64,[A-Za-z0-9+/=\s]{200,}/gi, "[تصویر]");

  const titleMatch = body.match(/^#\s+(.+?)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : "بدون عنوان";

  // llms/<service>/<platform>/... — دو سطح اول متادیتای مفیدی می‌دن
  const seg = llmsUrl.split("/llms/")[1]?.replace(/\.md$/, "").split("/") ?? [];
  const service = seg[0] ?? "unknown";
  const platform = seg.length > 1 && seg[1] !== "about" ? seg[1] : null;

  return { sourceUrl, title, service, platform, body: body.trim() };
}

interface Section {
  headingPath: string;
  content: string;
}

/** تقسیم سند به بخش‌ها بر اساس heading، با حفظ مسیر breadcrumb. */
function splitByHeadings(body: string, title: string): Section[] {
  const sections: Section[] = [];
  const stack: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const content = buf.join("\n").trim();
    if (content) sections.push({ headingPath: stack.filter(Boolean).join(" / ") || title, content });
    buf = [];
  };

  for (const line of body.split("\n")) {
    const h = line.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (h) {
      flush();
      const level = h[1].length;
      stack.length = Math.max(0, level - 1);
      stack[level - 1] = h[2].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

/** بخش‌های بلند رو روی مرز پاراگراف می‌شکنه، با کمی هم‌پوشانی. */
function splitLong(content: string): string[] {
  if (content.length <= MAX_CHARS) return [content];
  const paras = content.split(/\n\s*\n/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && (cur + "\n\n" + p).length > TARGET_CHARS) {
      out.push(cur);
      // آخرین پاراگراف به‌عنوان هم‌پوشانی، تا جمله‌ی مرزی بی‌بافت نمونه
      const tail = cur.split(/\n\s*\n/).slice(-1)[0] ?? "";
      cur = tail.length < 400 ? tail + "\n\n" + p : p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
  }
  if (cur.trim()) out.push(cur);

  // تور ایمنی: یک پاراگراف تکی (مثلاً بلوک کد طولانی بدون خط خالی) می‌تونه
  // از تقسیم پاراگرافی فرار کنه. اینجا روی مرز خط، سخت می‌شکنیمش.
  return out.flatMap((piece) => {
    if (piece.length <= MAX_CHARS * 1.5) return [piece];
    const lines = piece.split("\n");
    const parts: string[] = [];
    let acc = "";
    for (const line of lines) {
      if (acc && (acc + "\n" + line).length > TARGET_CHARS) {
        parts.push(acc);
        acc = line;
      } else {
        acc = acc ? acc + "\n" + line : line;
      }
    }
    if (acc.trim()) parts.push(acc);
    return parts;
  });
}

function buildChunks(docs: ParsedDoc[]): DocChunk[] {
  const chunks: DocChunk[] = [];
  let id = 0;

  for (const doc of docs) {
    // بخش‌های کوچک پشت‌سرهم ادغام می‌شن تا تکه‌ی بی‌معنیِ تک‌جمله‌ای نسازیم
    const merged: Section[] = [];
    for (const s of splitByHeadings(doc.body, doc.title)) {
      const prev = merged[merged.length - 1];
      if (prev && prev.content.length + s.content.length < TARGET_CHARS) {
        const sub = s.headingPath !== prev.headingPath ? `\n### ${s.headingPath}\n` : "\n";
        prev.content += `\n${sub}${s.content}`;
      } else {
        merged.push({ ...s });
      }
    }

    for (const section of merged) {
      for (const piece of splitLong(section.content)) {
        if (piece.trim().length < MIN_CHARS) continue;
        // بافت داخل خود متن تزریق می‌شه تا هم embedding و هم مدل بدونن
        // این تکه از کجای مستندات اومده
        const text = `# ${doc.title}\n## ${section.headingPath}\n\n${piece.trim()}`;
        chunks.push({
          id: id++,
          sourceUrl: doc.sourceUrl,
          title: doc.title,
          headingPath: section.headingPath,
          service: doc.service,
          platform: doc.platform,
          text,
          tokens: estimateTokens(text),
        });
      }
    }
  }
  return chunks;
}

async function embedAll(chunks: DocChunk[]): Promise<Float32Array> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { embedMany } = await import("ai");

  const baseURL = process.env.BASE_URL;
  const apiKey = process.env.LIARA_API_KEY;
  const modelId = process.env.MODEL_EMBED ?? "openai/text-embedding-3-small";
  if (!baseURL || !apiKey) {
    throw new Error(
      "BASE_URL و LIARA_API_KEY تنظیم نشدن. .env.local رو پر کن، یا با --chunks-only اجرا کن.",
    );
  }

  const provider = createOpenAI({ baseURL, apiKey });
  const model = provider.embeddingModel(modelId);

  const BATCH = 64;
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const { embeddings } = await embedMany({ model, values: batch.map((c) => c.text) });
    vectors.push(...embeddings);
    process.stdout.write(`\r  بردارسازی ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
  }
  process.stdout.write("\n");

  const dim = vectors[0].length;
  const flat = new Float32Array(vectors.length * dim);
  vectors.forEach((v, i) => flat.set(v, i * dim));
  return flat;
}

async function main() {
  const chunksOnly = process.argv.includes("--chunks-only");
  await mkdir(OUT, { recursive: true });

  const files = (await readdir(CACHE)).filter((f) => f.endsWith(".md"));
  const docs: ParsedDoc[] = [];
  for (const f of files) {
    const parsed = parseDoc(await readFile(path.join(CACHE, f), "utf8"));
    if (parsed && parsed.body.length > 100) docs.push(parsed);
  }
  console.log(`اسناد قابل استفاده: ${docs.length}/${files.length}`);

  const chunks = buildChunks(docs);
  const totalTokens = chunks.reduce((s, c) => s + c.tokens, 0);
  console.log(`تکه‌ها: ${chunks.length}`);
  console.log(`مجموع توکن تقریبی: ${totalTokens.toLocaleString("en-US")}`);
  console.log(`میانگین توکن هر تکه: ${Math.round(totalTokens / chunks.length)}`);

  const byService: Record<string, number> = {};
  for (const c of chunks) byService[c.service] = (byService[c.service] ?? 0) + 1;
  console.log("توزیع سرویس:", byService);

  await writeFile(path.join(OUT, "chunks.json"), JSON.stringify(chunks), "utf8");

  if (chunksOnly) {
    console.log("حالت --chunks-only: بردارسازی انجام نشد.");
    return;
  }

  const flat = await embedAll(chunks);
  const dim = flat.length / chunks.length;
  await writeFile(path.join(OUT, "embeddings.bin"), Buffer.from(flat.buffer));

  const manifest: IndexManifest = {
    builtAt: new Date().toISOString(),
    chunkCount: chunks.length,
    docCount: docs.length,
    embeddingModel: process.env.MODEL_EMBED ?? "openai/text-embedding-3-small",
    dimensions: dim,
  };
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`ایندکس ساخته شد: ${chunks.length} بردار × ${dim} بعد`);
}

main().catch((e) => {
  console.error("\n", e?.message ?? e);
  process.exit(1);
});
