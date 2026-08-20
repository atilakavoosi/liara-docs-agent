/**
 * شکل دقیق خروجی هر ابزار، جدا از `tools.ts`.
 *
 * چرا جدا: `tools.ts` به `lib/retrieval/search.ts` وابسته‌ست که از
 * `node:fs` برای خوندن ایندکس استفاده می‌کنه. اگه کامپوننت‌های کلاینت
 * مستقیم از `tools.ts` تایپ import کنن، Next تلاش می‌کنه fs رو توی
 * باندل مرورگر بذاره. این فایل فقط type-only ـه، صفر وابستگی runtime.
 */

export interface SearchResultItem {
  title: string;
  section: string;
  url: string;
  content: string;
}

export interface SearchDocsOutput {
  results: SearchResultItem[];
}

export interface DiagnoseErrorOutput {
  detectedErrorCode: string | null;
  results: Array<{ title: string; url: string; content: string }>;
}

export interface GenerateConfigOutput {
  fileName: string;
  content: string;
}

export interface RunbookStep {
  title: string;
  detail: string;
  sourceUrl?: string | null;
}

export interface BuildRunbookOutput {
  title: string;
  steps: RunbookStep[];
}

export interface DraftSupportTicketOutput {
  draft: {
    subject: string;
    body: string;
  };
}

export interface AskClarificationInput {
  question: string;
  options: string[];
}
