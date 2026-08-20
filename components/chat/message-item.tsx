"use client";

import type { UIMessage } from "ai";
import { Sparkles } from "lucide-react";
import { Markdown } from "./markdown";
import {
  SearchDocsPart,
  DiagnoseErrorPart,
  AskClarificationPart,
  GenerateConfigPart,
  BuildRunbookPart,
  DraftSupportTicketPart,
} from "./tool-parts";

export function MessageItem({
  message,
  isLatest,
  onPickOption,
}: {
  message: UIMessage;
  isLatest: boolean;
  onPickOption: (option: string, toolCallId: string) => void;
}) {
  if (message.role === "user") {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-accent px-4 py-2.5 text-[15px] leading-7 text-accent-foreground">
          {text}
        </div>
      </div>
    );
  }

  // پیام دستیار: بدون قاب حباب، جاری در ستون — طبق docs/DESIGN.md
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-3.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return part.text ? <Markdown key={i} text={part.text} /> : null;
            case "tool-searchDocs":
              return <SearchDocsPart key={i} part={part} />;
            case "tool-diagnoseError":
              return <DiagnoseErrorPart key={i} part={part} />;
            case "tool-askClarification":
              return (
                <AskClarificationPart key={i} part={part} isLatest={isLatest} onPick={onPickOption} />
              );
            case "tool-generateConfig":
              return <GenerateConfigPart key={i} part={part} />;
            case "tool-buildRunbook":
              return <BuildRunbookPart key={i} part={part} />;
            case "tool-draftSupportTicket":
              return <DraftSupportTicketPart key={i} part={part} />;
            case "step-start":
              return null;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
