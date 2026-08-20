"use client";

import type { UIMessage } from "ai";
import { ExternalLink, FolderTree, Library } from "lucide-react";
import { collectSources } from "@/lib/citations";

/**
 * پنل شفافیت منابع — عنصر امضای محصول (docs/DESIGN.md).
 * برای آخرین پیام دستیاری که سند بازیابی کرده، فهرست منابع رو با ترتیب
 * همون شماره‌هایی که در متن پاسخ به‌شکل [۱][۲] استفاده شدن نشون می‌ده.
 */
export function SourcesPanel({ messages }: { messages: UIMessage[] }) {
  const lastAssistantWithSources = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && collectSources(m).length > 0);

  const sources = lastAssistantWithSources ? collectSources(lastAssistantWithSources) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
        <Library className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">منابع این پاسخ</h3>
      </div>

      {sources.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <FolderTree className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            وقتی لیارا یار سند بازیابی کنه، فهرستش با لینک واقعی اینجا نمایش داده می‌شه.
          </p>
        </div>
      ) : (
        <ol className="flex-1 space-y-2 overflow-y-auto p-3">
          {sources.map((s) => (
            <li key={s.url} id={`cite-${s.index}`} className="scroll-mt-4">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                    {s.index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                      {s.title}
                    </p>
                    {s.section && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.section}</p>
                    )}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${Math.max(28, 100 - (s.index - 1) * 14)}%` }}
                      />
                    </div>
                  </div>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
