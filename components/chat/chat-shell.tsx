"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Header } from "./header";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";
import { MessageItem } from "./message-item";
import { SourcesPanel } from "./sources-panel";
import { collectSources } from "@/lib/citations";
import {
  type ConversationRecord,
  deleteConversation,
  listConversations,
  loadConversation,
  newConversationId,
  saveConversation,
} from "@/lib/conversation-store";

interface Profile {
  platform: string | null;
  service: string | null;
}

const PROFILE_KEY = "liarayar:profile";

function loadProfile(): Profile {
  if (typeof window === "undefined") return { platform: null, service: null };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // localStorage در دسترس نیست یا مقدار خرابه — بی‌خیال پروفایل قبلی می‌شیم
  }
  return { platform: null, service: null };
}

export function ChatShell() {
  const { messages, sendMessage, status, error, stop, clearError, setMessages, addToolResult } = useChat();
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile>({ platform: null, service: null });
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setConversationId(newConversationId());
    setConversations(listConversations());
  }, []);

  // بعد از هر تغییر پیام‌ها (فقط وقتی استریم تموم شده)، گفتگوی فعلی توی
  // localStorage ذخیره می‌شه — بدون این، «تاریخچه» فقط یک لیست خالیه.
  // گفتگوی بدون پیام ذخیره نمی‌شه (چک داخل saveConversation).
  useEffect(() => {
    if (status !== "ready" || !conversationId) return;
    if (messages.length === 0) return;
    saveConversation(conversationId, messages);
    setConversations(listConversations());
  }, [status, messages, conversationId]);

  // بعد از هر پیام دستیار، اگه searchDocs/diagnoseError با platform یا
  // service مشخصی صدا زده شده، همون رو به‌عنوان پروفایل کاربر نگه می‌داریم
  // — بدون نیاز به یک فراخوانی جدای مدل برای استخراج پروفایل.
  //
  // فقط وقتی status به 'ready' برسه اجرا می‌شه، نه روی هر تکه‌ی استریم:
  // در حین استریم، `messages` ده‌ها بار در ثانیه رفرنسش عوض می‌شه، و اجرای
  // این افکت روی هر تکه باعث setState پشت‌سرهم و رندرهای غیرضروری می‌شد.
  useEffect(() => {
    if (status !== "ready") return;

    setProfile((prev) => {
      let platform = prev.platform;
      let service = prev.service;
      for (const m of messages) {
        if (m.role !== "assistant") continue;
        for (const part of m.parts) {
          if (part.type === "tool-searchDocs" || part.type === "tool-diagnoseError") {
            const input = part.input as { platform?: string | null; service?: string | null } | undefined;
            if (input?.platform) platform = input.platform;
            if ("service" in (input ?? {}) && input?.service) service = input.service;
          }
        }
      }
      if (platform === prev.platform && service === prev.service) return prev;

      const next = { platform, service };
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        // ذخیره نشدن پروفایل اتفاق مهمی نیست، فقط شخصی‌سازی جلسه‌ی بعد رو از دست می‌دیم
      }
      return next;
    });
  }, [status, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const isStreaming = status === "submitted" || status === "streaming";

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      sendMessage({ text: trimmed }, { body: { profile } });
      setInput("");
    },
    [isStreaming, profile, sendMessage],
  );

  // وقتی کاربر روی یکی از گزینه‌های askClarification کلیک می‌کنه، اول باید
  // نتیجه‌ی اون tool call رو تکمیل کنیم — وگرنه در تاریخچه‌ی مکالمه یک
  // tool-call بدون نتیجه می‌مونه و درخواست بعدی رو API رد می‌کنه
  // («Tool result is missing for tool call ...»). بعدش انتخاب کاربر رو
  // به‌شکل یک پیام معمولی می‌فرستیم تا مدل طبیعی بهش جواب بده.
  const handlePickOption = useCallback(
    (option: string, toolCallId: string) => {
      addToolResult({ tool: "askClarification", toolCallId, output: { selected: option } });
      submit(option);
    },
    [addToolResult, submit],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(newConversationId());
  }, [setMessages]);

  const handleLoadConversation = useCallback(
    (id: string) => {
      const loaded = loadConversation(id);
      if (!loaded) return;
      setMessages(loaded);
      setConversationId(id);
    },
    [setMessages],
  );

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id);
      setConversations(listConversations());
      if (id === conversationId) handleNewChat();
    },
    [conversationId, handleNewChat],
  );

  const sources = messages.length
    ? collectSources([...messages].reverse().find((m) => m.role === "assistant") ?? messages[0])
    : [];

  return (
    <div className="flex h-dvh flex-col">
      <Header
        onNewChat={handleNewChat}
        onToggleSources={() => setSourcesOpen(true)}
        hasSources={sources.length > 0}
        conversations={conversations}
        onLoadConversation={handleLoadConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex-1 overflow-y-auto scroll-smooth">
            {messages.length === 0 ? (
              <EmptyState onPick={submit} />
            ) : (
              <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
                {messages.map((m, i) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    isLatest={i === messages.length - 1}
                    onPickOption={handlePickOption}
                  />
                ))}
                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span className="flex-1">
                      یه مشکل موقت پیش اومد. اتصال یا سرویس هوش مصنوعی رو چک کن.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => clearError()}
                    >
                      <RotateCw className="size-3" />
                      باشه
                    </Button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => submit(input)}
            onStop={stop}
            disabled={isStreaming}
            isStreaming={isStreaming}
          />
        </div>

        <aside className="hidden border-s border-border lg:block">
          <SourcesPanel messages={messages} />
        </aside>
      </div>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>منابع پاسخ</SheetTitle>
          </SheetHeader>
          <SourcesPanel messages={messages} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
