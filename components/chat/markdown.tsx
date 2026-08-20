"use client";

import { memo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { linkifyCitations, isCitationHref } from "@/lib/citations";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "کپی شد" : "کپی"}
    </button>
  );
}

/** بلوک کد با هدر (زبان/نام فایل + دکمه کپی) — نه یک `<pre>` خام. */
export function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-[#1b1e1c] dark:bg-black/30">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] text-white/50 uppercase tracking-wide">
          {language || "text"}
        </span>
        <CopyButton text={code} />
      </div>
      {/* dir="ltr" اجباریه: کد همیشه چپ‌به‌راست می‌مونه، حتی وسط صفحه‌ی
          RTL — وگرنه ترتیب علائم و آکولادهای JSON/کد به‌هم می‌ریزه. */}
      <pre dir="ltr" className="overflow-x-auto p-3 text-start text-[13px] leading-relaxed">
        <code className="font-mono text-white/90">{code}</code>
      </pre>
    </div>
  );
}

function CitationBadge({ n, href }: { n: number; href: string }) {
  return (
    <a
      href={href}
      className="mx-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 align-super text-[10px] font-semibold text-accent-foreground no-underline hover:bg-primary hover:text-primary-foreground transition-colors"
    >
      {n}
    </a>
  );
}

const components: Components = {
  a({ href, children, ...props }) {
    const citeN = isCitationHref(href);
    if (citeN !== null) {
      return <CitationBadge n={citeN} href={href!} />;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-brand-blue underline decoration-brand-blue/30 underline-offset-2 hover:decoration-brand-blue"
        {...props}
      >
        {children}
        <ExternalLink className="size-3" />
      </a>
    );
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const text = String(children).replace(/\n$/, "");
    if (match) {
      return <CodeBlock language={match[1]} code={text} />;
    }
    return (
      <code
        dir="ltr"
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    // بلوک کد قبلاً داخل CodeBlock پیچیده شده؛ pre پیش‌فرض رو خنثی می‌کنیم
    return <>{children}</>;
  },
  ul({ children }) {
    return <ul className="my-2 list-disc space-y-1 pe-5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-2 list-decimal space-y-1 pe-5">{children}</ol>;
  },
  p({ children }) {
    return <p className="leading-7 [&:not(:first-child)]:mt-3">{children}</p>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-border bg-muted px-3 py-2 text-start font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-border/60 px-3 py-2">{children}</td>;
  },
};

export const Markdown = memo(function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("text-[15px]", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linkifyCitations(text)}
      </ReactMarkdown>
    </div>
  );
});
