"use client";

import { useState } from "react";
import {
  Check,
  History,
  MessageSquareText,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { ConversationRecord } from "@/lib/conversation-store";

function relativeTime(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "همین الان";
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ساعت پیش`;
  return `${Math.round(diffHour / 24)} روز پیش`;
}

function HistorySheet({
  conversations,
  activeConversationId,
  onLoadConversation,
  onDeleteConversation,
}: {
  conversations: ConversationRecord[];
  activeConversationId: string;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmDeleteId(null);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <History className="size-3.5" />
          تاریخچه
          {conversations.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              {conversations.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-[85vw] max-w-sm flex-col p-0">
        <SheetHeader className="border-b border-border px-4 py-3.5 text-start">
          <SheetTitle className="text-sm font-semibold">تاریخچه گفتگوها</SheetTitle>
        </SheetHeader>

        {conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <History className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              هنوز گفتگویی ذخیره نشده — بعد از اولین پیام، اینجا نگه داشته می‌شه
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="space-y-1 p-2">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                const isConfirming = confirmDeleteId === c.id;
                return (
                  <li key={c.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-lg px-1 py-1 transition-colors",
                        isActive ? "bg-accent" : "hover:bg-accent/50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onLoadConversation(c.id);
                          setOpen(false);
                        }}
                        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-start"
                      >
                        <span className="line-clamp-1 w-full text-sm font-medium text-foreground">
                          {c.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {relativeTime(c.updatedAt)}
                        </span>
                      </button>

                      {isConfirming ? (
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              onDeleteConversation(c.id);
                              setConfirmDeleteId(null);
                            }}
                            aria-label={`تأیید حذف «${c.title}»`}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setConfirmDeleteId(null)}
                            aria-label="انصراف از حذف"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmDeleteId(c.id)}
                          aria-label={`حذف «${c.title}»`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Header({
  onNewChat,
  onToggleSources,
  sourcesCollapsed,
  hasSources,
  conversations,
  activeConversationId,
  onLoadConversation,
  onDeleteConversation,
}: {
  onNewChat: () => void;
  onToggleSources: () => void;
  sourcesCollapsed: boolean;
  hasSources: boolean;
  conversations: ConversationRecord[];
  activeConversationId: string;
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
        <HistorySheet
          conversations={conversations}
          activeConversationId={activeConversationId}
          onLoadConversation={onLoadConversation}
          onDeleteConversation={onDeleteConversation}
        />

        <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-1.5 text-xs">
          <Plus className="size-3.5" />
          گفتگوی جدید
        </Button>

        {hasSources && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onToggleSources}
                aria-label={sourcesCollapsed ? "نمایش منابع" : "پنهان‌کردن منابع"}
              >
                {sourcesCollapsed ? (
                  <PanelRightOpen className="size-4" />
                ) : (
                  <PanelRightClose className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{sourcesCollapsed ? "نمایش منابع" : "پنهان‌کردن منابع"}</TooltipContent>
          </Tooltip>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
