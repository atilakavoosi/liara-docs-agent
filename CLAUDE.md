# لیارایار — قانون اساسی پروژه

دستیار هوشمند مستندات لیارا. چالش ۱ هکاتون Vibe Coding.

## پروتکل سشن (غیرقابل مذاکره)

**شروع هر سشن:** این فایل + `TASKS.md` + آخرین ورودی `PROGRESS.md` رو بخون.
**پایان هر بلوک کاری:** `TASKS.md` آپدیت، یک ورودی به `PROGRESS.md`، کامیت.

## دستورها

```bash
npm run dev        # توسعه‌ی محلی
npm run build      # build پروداکشن — قبل از هر کامیت مهم اجرا بشه
npm run lint
npx tsx scripts/ingest.ts   # ساخت ایندکس مستندات (آفلاین، به‌ندرت)
npx tsx scripts/eval.ts     # سنجش کیفیت بازیابی
```

## قوانین طلایی

1. **همیشه قابل دمو.** نسخه‌ی زنده روی لیارا هیچ‌وقت نباید خراب بمونه.
   بعد از هر تغییر مهم، نسخه‌ی زنده رو چک کن نه فقط لوکال رو.
2. **هیچ تصمیم معماری بی‌صدا نه.** هر تصمیم مهم همون لحظه یک ADR در
   `docs/DECISIONS.md` می‌گیره. فایل append-only ـه.
3. **کلید API فقط سمت سرور.** هرگز `NEXT_PUBLIC_`. هرگز در کامیت.
4. **ویرایش فایل موجود، نه ساختن فایل موازی.** یوتیلیتی تکراری ممنوع.
5. **کامیت کوچیک و مکرر**، هر کامیت اصولاً قابل دیپلوی.
6. مبهم بود؟ فرض معقول بساز و جلو برو، ولی فرضت رو بنویس. برای فورک بزرگ
   معماری یا محصول، صریح بپرس.

## جزئیات کجاست (اینجا کپی نکن، ارجاع بده)

- تحلیل مسئله، scope، DoD → `docs/PROJECT.md`
- استک، ساختار، مدل داده → `docs/ARCHITECTURE.md`
- لاگ تصمیم‌ها → `docs/DECISIONS.md`
- توکن‌های طراحی و قوانین UI → `docs/DESIGN.md`
- چک‌لیست امنیتی → `docs/SECURITY.md`
- کانبان و «کجا موندیم» → `TASKS.md`
- لاگ زمانی → `PROGRESS.md`

## حقایق پلتفرم (تأییدشده، حدس نزن)

- ارائه‌دهنده‌ی AI: **AvalAI** روی `https://api.avalai.ir/v1` — سازگار با
  OpenAI، مدل‌ها **بدون** پیشوند provider (`gpt-5.6-luna` نه
  `openai/gpt-5.6-luna`). دیپلوی همچنان کامل روی PaaS لیارا انجام می‌شه؛
  فقط ارائه‌دهنده‌ی مدل فرق داره. (ADR-006)
- env varها: `BASE_URL` و `AI_API_KEY`
- کورپوس مستندات: `https://docs.liara.ir/all-links-llms.txt` → ۱۱۴۲ فایل `.md`
- هر فایل `.md` با BOM شروع می‌شه و خط اولش `Original link: <url>` ـه
  → همین URL منبعِ citation ماست
- پلتفرم Next لیارا: Node ۲۰/۲۲/۲۴، و فقط پروژه‌های `create-next-app` رو اجرا می‌کنه
- Next 16: اگه بعداً middleware لازم شد، اسم فایل `proxy.ts` و اسم export
  `proxy` هست نه `middleware`. `params`/`cookies()`/`headers()` هم async
  شدن — فعلاً کد ما هیچ‌کدوم رو استفاده نمی‌کنه، پس بی‌اثره.
- Next 16: اگه بعداً middleware لازم شد، اسم فایل `proxy.ts` و اسم export `proxy` هست نه `middleware` (تغییر Next 16). `params`/`cookies()`/`headers()` هم async شدن — فعلاً کد ما ازشون استفاده نمی‌کنه.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
