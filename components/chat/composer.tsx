"use client";

import { useRef, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  isStreaming,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  disabled: boolean;
  isStreaming: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-blur:bg-background/80">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="سؤالت رو درباره‌ی سرویس‌های لیارا بپرس…"
          rows={1}
          className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
        />
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onStop}
            className="size-9 shrink-0 rounded-xl"
            aria-label="توقف پاسخ"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className={cn(
              "size-9 shrink-0 rounded-xl transition-opacity",
              (!value.trim() || disabled) && "opacity-40",
            )}
            aria-label="ارسال پیام"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
      <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-muted-foreground">
        لیارایار بر اساس مستندات رسمی لیارا پاسخ می‌ده و همیشه منبع نشون می‌ده.
      </p>
    </div>
  );
}
