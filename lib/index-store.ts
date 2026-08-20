import { readFile } from "node:fs/promises";
import path from "node:path";
import { BM25Index } from "./retrieval/bm25";
import { VectorIndex } from "./retrieval/vector";
import type { DocChunk, IndexManifest } from "./types";

/**
 * لود یک‌باره‌ی ایندکس بازیابی در حافظه‌ی پروسه.
 *
 * ساخت ایندکس BM25 حدود ۷۰۰ میلی‌ثانیه طول می‌کشه و بردارها ~۱۳.۸ مگابایتن.
 * هیچ‌کدوم نباید در هر درخواست تکرار بشن، پس پشت یک promise تکی کش می‌شن.
 * چون Next ماژول‌ها را بین درخواست‌ها نگه می‌داره، این عملاً یک singleton
 * در سطح پروسه‌ست.
 */

export interface DocsIndex {
  chunks: DocChunk[];
  bm25: BM25Index;
  vectors: VectorIndex | null;
  manifest: IndexManifest | null;
  /** اگه بردارها لود نشدن، دلیلش اینجاست — برای نمایش در /api/health */
  vectorError: string | null;
}

let cached: Promise<DocsIndex> | null = null;

const DATA_DIR = path.join(process.cwd(), "data");

async function load(): Promise<DocsIndex> {
  const chunks: DocChunk[] = JSON.parse(
    await readFile(path.join(DATA_DIR, "chunks.json"), "utf8"),
  );
  const bm25 = new BM25Index(chunks);

  // بردارها اختیاری‌ن: اپ باید حتی وقتی ایندکس برداری ساخته نشده هم بالا
  // بیاد و با BM25 تنها کار کنه. افت کیفیت آره، خرابی کامل نه.
  let vectors: VectorIndex | null = null;
  let manifest: IndexManifest | null = null;
  let vectorError: string | null = null;

  try {
    manifest = JSON.parse(await readFile(path.join(DATA_DIR, "manifest.json"), "utf8"));
    const buf = await readFile(path.join(DATA_DIR, "embeddings.bin"));
    const floats = new Float32Array(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
    vectors = new VectorIndex(floats, manifest!.dimensions);

    if (vectors.count !== chunks.length) {
      throw new Error(
        `ناهماهنگی ایندکس: ${vectors.count} بردار در برابر ${chunks.length} تکه. ` +
          `ingest.ts رو دوباره اجرا کن.`,
      );
    }
  } catch (err) {
    vectorError = err instanceof Error ? err.message : String(err);
    vectors = null;
  }

  return { chunks, bm25, vectors, manifest, vectorError };
}

export function getIndex(): Promise<DocsIndex> {
  cached ??= load();
  return cached;
}
