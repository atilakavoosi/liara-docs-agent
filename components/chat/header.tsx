"use client";

import { History, MessageSquareText, PanelRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationRecord } from "@/lib/conversation-store";

function relativeTime(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "همین الان";
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ساعت پیش`;
  return `${Math.round(diffHour / 24)} روز پیش`;
}

export function Header({
  onNewChat,
  onToggleSources,
  hasSources,
  conversations,
  onLoadConversation,
  onDeleteConversation,
}: {
  onNewChat: () => void;
  onToggleSources: () => void;
  hasSources: boolean;
  conversations: ConversationRecord[];
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <History className="size-3.5" />
              تاریخچه
              {conversations.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                  {conversations.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {conversations.length === 0 ? (
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                هنوز گفتگویی ذخیره نشده — بعد از اولین پیام، اینجا نگه داشته می‌شه
              </DropdownMenuLabel>
            ) : (
              conversations.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onSelect={() => onLoadConversation(c.id)}
                  className="items-center justify-between gap-2"
                >
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(c.updatedAt)}
                  </span>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(c.id);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`حذف «${c.title}»`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
