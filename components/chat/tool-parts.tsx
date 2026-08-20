"use client";

import { useState } from "react";
import type { ToolUIPart } from "ai";
import {
  Search,
  HelpCircle,
  Bug,
  FileCog,
  ListChecks,
  LifeBuoy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeBlock, CopyButton } from "./markdown";
import { Markdown } from "./markdown";
import type {
  SearchDocsOutput,
  DiagnoseErrorOutput,
  GenerateConfigOutput,
  BuildRunbookOutput,
  DraftSupportTicketOutput,
  AskClarificationInput,
} from "@/lib/ai/tool-types";

/** نشانگر «در حال کار» — پالس ملایم mint، نه اسپینر ژنریک. */
function PulseDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  );
}

function ToolStatusRow({
  icon: Icon,
  label,
  running,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  running: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {running ? <PulseDot /> : <Icon className="size-3.5" />}
      <span>{label}</span>
    </div>
  );
}

export function SearchDocsPart({ part }: { part: ToolUIPart }) {
  const running = part.state !== "output-available";
  const input = part.input as { query?: string } | undefined;

  if (running) {
    return <ToolStatusRow icon={Search} label="در حال جستجو در مستندات لیارا…" running />;
  }

  const output = part.output as SearchDocsOutput;
  return (
    <ToolStatusRow
      icon={Search}
      running={false}
      label={
        output.results.length > 0
          ? `${output.results.length} سند مرتبط پیدا شد${input?.query ? ` · «${input.query}»` : ""}`
          : "سندی پیدا نشد"
      }
    />
  );
}

export function DiagnoseErrorPart({ part }: { part: ToolUIPart }) {
  const running = part.state !== "output-available";
  if (running) {
    return <ToolStatusRow icon={Bug} label="در حال تشخیص خطا…" running />;
  }
  const output = part.output as DiagnoseErrorOutput;
  return (
    <ToolStatusRow
      icon={Bug}
      running={false}
      label={
        output.detectedErrorCode
          ? `کد خطای ${output.detectedErrorCode} شناسایی شد`
          : "بررسی خطا انجام شد"
      }
    />
  );
}

export function AskClarificationPart({
  part,
  isLatest,
  onPick,
}: {
  part: ToolUIPart;
  isLatest: boolean;
  /** toolCallId رو هم می‌ده تا نتیجه‌ی این tool call قبل از ارسال پیام بعدی تکمیل بشه */
  onPick: (option: string, toolCallId: string) => void;
}) {
  if (part.state === "input-streaming" || !part.input) {
    return <ToolStatusRow icon={HelpCircle} label="در حال آماده‌سازی سؤال…" running />;
  }
  const { question, options } = part.input as AskClarificationInput;
  const answered = part.state === "output-available";

  return (
    <div className="my-2 max-w-md rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start gap-2">
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-brand-blue" />
        <p className="text-sm font-medium text-foreground">{question}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            size="sm"
            disabled={!isLatest || answered}
            onClick={() => onPick(opt, part.toolCallId)}
            className="h-auto rounded-full px-3 py-1.5 text-xs font-medium"
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function GenerateConfigPart({ part }: { part: ToolUIPart }) {
  const running = part.state !== "output-available";
  if (running) {
    return <ToolStatusRow icon={FileCog} label="در حال ساخت فایل کانفیگ…" running />;
  }
  const output = part.output as GenerateConfigOutput;
  return <CodeBlock language={output.fileName} code={output.content} />;
}

export function BuildRunbookPart({ part }: { part: ToolUIPart }) {
  const running = part.state !== "output-available";
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (running) {
    return <ToolStatusRow icon={ListChecks} label="در حال ساخت راهنمای گام‌به‌گام…" running />;
  }
  const output = part.output as BuildRunbookOutput;

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <ListChecks className="size-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">{output.title}</h4>
        <span className="ms-auto text-xs text-muted-foreground">
          {checked.size}/{output.steps.length}
        </span>
      </div>
      <ol className="divide-y divide-border">
        {output.steps.map((step, i) => (
          <li key={i} className="flex gap-3 px-4 py-3">
            <Checkbox
              checked={checked.has(i)}
              onCheckedChange={(v) =>
                setChecked((prev) => {
                  const next = new Set(prev);
                  if (v) next.add(i);
                  else next.delete(i);
                  return next;
                })
              }
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${checked.has(i) ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {step.title}
              </p>
              <div className="mt-1 text-[13px] text-muted-foreground">
                <Markdown text={step.detail} />
              </div>
              {step.sourceUrl && (
                <a
                  href={step.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
                >
                  منبع <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function DraftSupportTicketPart({ part }: { part: ToolUIPart }) {
  const running = part.state !== "output-available";
  if (running) {
    return <ToolStatusRow icon={LifeBuoy} label="در حال آماده‌سازی پیش‌نویس تیکت…" running />;
  }
  const output = part.output as DraftSupportTicketOutput;
  const fullText = `${output.draft.subject}\n\n${output.draft.body}`;

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-warning/40 bg-warning/5">
      <div className="flex items-center justify-between gap-2 border-b border-warning/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">پیش‌نویس تیکت پشتیبانی</span>
        </div>
        <CopyButton text={fullText} />
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">{output.draft.subject}</p>
        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {output.draft.body}
        </p>
        <p className="mt-3 text-xs text-muted-foreground/80">
          این فقط پیش‌نویسه و ثبت نشده — متن رو کپی کن و در{" "}
          <a
            href="https://console.liara.ir/tickets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:underline"
          >
            بخش تیکت‌های کنسول لیارا
          </a>{" "}
          ارسال کن.
        </p>
      </div>
    </div>
  );
}
