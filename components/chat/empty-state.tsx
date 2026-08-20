"use client";

import { Server, Bug, Coins, Database } from "lucide-react";

const SUGGESTIONS = [
  { icon: Server, text: "چطور یک برنامه Next.js را روی لیارا دیپلوی کنم؟" },
  { icon: Bug, text: "خطای ECONNRESET موقع اتصال به دیتابیس می‌گیرم" },
  { icon: Coins, text: "پلن‌های سرویس هوش مصنوعی لیارا چه فرقی دارن؟" },
  { icon: Database, text: "چطور از برنامه‌ام به دیتابیس PostgreSQL وصل بشم؟" },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <span className="text-2xl">💬</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">با لیارا یار شروع کن</h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          هر سؤالی درباره‌ی سرویس‌های لیارا داری بپرس — از دیپلوی گرفته تا رفع خطا.
          هر پاسخ از مستندات رسمی میاد و منبعش رو نشون می‌ده.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, text }) => (
          <button
            key={text}
            onClick={() => onPick(text)}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-start text-[13px] leading-6 text-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
