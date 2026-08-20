import { readFileSync } from "node:fs";
import { BM25Index } from "../lib/retrieval/bm25";
import type { DocChunk } from "../lib/types";

const chunks: DocChunk[] = JSON.parse(readFileSync("data/chunks.json", "utf8"));
console.time("build");
const idx = new BM25Index(chunks);
console.timeEnd("build");
console.log("unique terms:", idx.termCount, "| chunks:", chunks.length);

const queries = [
  "چطور یک برنامه Next.js را روی لیارا دیپلوی کنم؟",
  "خطای ECONNRESET موقع اتصال به دیتابیس",
  "نسخه nodeVersion را در liara.json چطور عوض کنم",
  "پلن های سرویس هوش مصنوعی چیه",
  "اتصال به object storage با S3",
];

for (const q of queries) {
  console.log(`\n=== ${q}`);
  for (const [id, score] of idx.search(q, 3)) {
    const c = chunks[id];
    console.log(`  ${score.toFixed(2)} | ${c.title.slice(0, 45)} | ${c.sourceUrl.replace("https://docs.liara.ir", "")}`);
  }
}
