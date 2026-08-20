"use client";

import { MessageSquareText, PanelRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header({
  onNewChat,
  onToggleSources,
  hasSources,
}: {
  onNewChat: () => void;
  onToggleSources: () => void;
  hasSources: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
          <MessageSquareText className="size-4 text-primary-foreground" />
        </div>
        <span className="text-[15px] font-bold text-foreground">لیارا یار</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          دستیار مستندات لیارا
        </span>
      </div>

      <div className="ms-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-1.5 text-xs">
          <Plus className="size-3.5" />
          گفتگوی جدید
        </Button>
        {hasSources && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 lg:hidden"
            onClick={onToggleSources}
            aria-label="نمایش منابع"
          >
            <PanelRight className="size-4" />
          </Button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
