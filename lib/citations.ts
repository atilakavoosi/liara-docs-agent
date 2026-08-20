import type { UIMessage } from "ai";
import type { SearchDocsOutput, DiagnoseErrorOutput, SearchResultItem } from "./ai/tool-types";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function faDigitsToLatin(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

export interface SourceEntry extends SearchResultItem {
  /** شماره‌ای که مدل در متن به‌شکل [۱] بهش ارجاع می‌ده (پایه ۱) */
  index: number;
}

/**
 * از تمام tool-partهای یک پیام دستیار، فهرست منابع یکتا (بر اساس url)
 * رو به همون ترتیبی که به مدل داده شدن می‌سازه. این ترتیب پایه‌ی
 * شماره‌گذاری [۱][۲] در متن پاسخه — چون همون ترتیبیه که مدل توی
 * تاریخچه‌ی مکالمه دیده.
 */
export function collectSources(message: UIMessage): SourceEntry[] {
  const seen = new Map<string, SourceEntry>();

  for (const part of message.parts) {
    let items: SearchResultItem[] = [];
    if (part.type === "tool-searchDocs" && part.state === "output-available") {
      items = (part.output as SearchDocsOutput).results;
    } else if (part.type === "tool-diagnoseError" && part.state === "output-available") {
      const out = part.output as DiagnoseErrorOutput;
      items = out.results.map((r) => ({ ...r, section: "" }));
    } else {
      continue;
    }
    for (const item of items) {
      if (!seen.has(item.url)) {
        seen.set(item.url, { ...item, index: seen.size + 1 });
      }
    }
  }

  return [...seen.values()];
}

/**
 * تبدیل ارجاع‌های `[۱]`، `[۲]` در متن مدل به لینک‌های مارک‌داون قابل‌کلیک
 * (`[۱](#cite-1)`) تا رندرر مارک‌داون بتونه به‌شکل یک badge نمایششون بده،
 * بدون نیاز به یک remark plugin سفارشی.
 */
export function linkifyCitations(text: string): string {
  return text.replace(/\[([۰-۹]+)\]/g, (match, digits: string) => {
    const n = faDigitsToLatin(digits);
    if (!/^\d+$/.test(n)) return match;
    return `[${digits}](#cite-${n})`;
  });
}

export function isCitationHref(href: string | undefined): number | null {
  if (!href?.startsWith("#cite-")) return null;
  const n = Number(href.slice("#cite-".length));
  return Number.isFinite(n) ? n : null;
}
