# TASKS

> **آخرین جایی که موندیم:** بلوک ۰ تموم شد — اسکلت Next 16 با audit تمیز،
> liara.json، health endpoint و فایل‌های حافظه ساخته شدن. قدم بعدی:
> کامیت اول و **اثبات مسیر دیپلوی روی لیارا** قبل از نوشتن هر کد دیگه‌ای.

## In Progress
- [ ] بلوک ۰ — دیپلوی اولیه روی لیارا و تأیید مسیر push → build → live

## Backlog

### بلوک ۱ — Ingestion (~۴ ساعت)
- [ ] `scripts/ingest.ts`: گرفتن all-links، fetch با concurrency و retry، کش دیسکی
- [ ] strip کردن BOM، جدا کردن `Original link:`، استخراج عنوان
- [ ] chunk بر اساس heading با overlap + متادیتای service/platform
- [ ] embed دسته‌ای و نوشتن `data/chunks.json` + `data/embeddings.bin`

### بلوک ۲ — بازیابی (~۵ ساعت)
- [ ] `lib/retrieval/normalize-fa.ts` — نرمال‌سازی فارسی
- [ ] BM25 + جستجوی برداری + ادغام RRF
- [ ] rerank با مدل ارزان
- [ ] `scripts/eval.ts` + ~۳۰ سؤال طلایی، گزارش recall@5

### بلوک ۳ — لایه‌ی Agentic (~۶ ساعت)
- [ ] intent router با مدل ارزان
- [ ] toolها: searchDocs, askClarification, diagnoseError, generateConfig,
      buildRunbook, draftSupportTicket
- [ ] `app/api/chat/route.ts` با streamText چندمرحله‌ای
- [ ] پروفایل شخصی‌سازی و تزریقش به system prompt

### بلوک ۴ — UI (~۶ ساعت)
- [ ] `docs/DESIGN.md` قبل از کد UI
- [ ] shadcn/ui + RTL + Vazirmatn + دارک‌مود
- [ ] چت استریم، کارت منبع، کدبلاک کپی‌شو
- [ ] پنل شفافیت بازیابی («چرا این جواب؟»)
- [ ] حالت خالی/لودینگ/خطا + ریسپانسیو

### بلوک ۵ — امنیت و هزینه (~۴ ساعت)
- [ ] rate limiting کشویی + zod روی ورودی‌ها
- [ ] لاگ ساخت‌یافته با request ID و مصرف توکن
- [ ] کش معنایی
- [ ] داشبورد `/admin`

### بلوک ۶ — polish و دمو (~۵ ساعت)
- [ ] seed data و سؤال‌های پیشنهادی
- [ ] ویدیوی دمو (بیمه‌ی قطعی اینترنت)
- [ ] README یک‌صفحه‌ای با لینک دمو
- [ ] `npm audit` نهایی + تست موبایل و تب ناشناس

## Done
- [x] فاز صفر: تحلیل مسئله، scope، DoD، نقشه‌ی معیار داوری → `docs/PROJECT.md`
- [x] تحقیق پلتفرم: کشف کورپوس markdown، تأیید embedding، تأیید نسخه‌های Node
- [x] اسکلت Next 16 + Tailwind + TS، `npm audit` تمیز
- [x] `liara.json` با healthCheck، `.env.example`، `/api/health`
- [x] ADR-001 تا ۰۰۴

## Blocked
- دو چالش دیگه‌ی هکاتون — منتظر شرح چالش از آتیلا
