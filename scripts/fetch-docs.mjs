/**
 * مرحله‌ی ۱ ingestion: دانلود کل مستندات لیارا به .cache/
 *
 * جدا از ingest.ts نگه داشته شده چون به هیچ کلید APIای نیاز نداره و
 * کندترین مرحله‌ست — با کش دیسکی، اجراهای بعدی تقریباً آنی‌ن.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const INDEX_URL = "https://docs.liara.ir/all-links-llms.txt";
const CACHE = path.join(process.cwd(), ".cache", "docs");
const CONCURRENCY = 10;
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "liarayar-ingest/0.1 (hackathon)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    await sleep(500 * 2 ** (attempt - 1)); // backoff نمایی
    return fetchWithRetry(url, attempt + 1);
  }
}

/** نام فایل کش امن و یکتا برای هر URL */
const cacheName = (url) =>
  createHash("sha1").update(url).digest("hex").slice(0, 16) + ".md";

async function main() {
  await mkdir(CACHE, { recursive: true });

  const index = await fetchWithRetry(INDEX_URL);
  const urls = [...index.matchAll(/https:\/\/docs\.liara\.ir\/llms\/[^\s)]+\.md/g)]
    .map((m) => m[0]);
  const unique = [...new Set(urls)];
  console.log(`ایندکس: ${unique.length} سند یکتا`);

  let done = 0, cached = 0, failed = 0;
  const failures = [];
  const queue = [...unique];

  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      const file = path.join(CACHE, cacheName(url));
      if (existsSync(file)) { cached++; done++; continue; }
      try {
        const text = await fetchWithRetry(url);
        // URL مبدأ رو کنار محتوا نگه می‌داریم تا مرحله‌ی بعد لازم نباشه دوباره حدس بزنه
        await writeFile(file, `<!--source:${url}-->\n${text}`, "utf8");
        done++;
      } catch (err) {
        failed++; failures.push({ url, error: String(err.message ?? err) });
      }
      if (done % 100 === 0) console.log(`  ... ${done}/${unique.length}`);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeFile(
    path.join(process.cwd(), ".cache", "manifest.json"),
    JSON.stringify({ fetchedAt: new Date().toISOString(), total: unique.length, urls: unique, failures }, null, 2),
    "utf8",
  );

  console.log(`\nتمام: ${done} موفق (${cached} از کش)، ${failed} ناموفق`);
  if (failures.length) console.log("ناموفق‌ها:", failures.slice(0, 10));
}

main().catch((e) => { console.error(e); process.exit(1); });
