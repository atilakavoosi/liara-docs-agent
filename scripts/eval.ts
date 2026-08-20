/**
 * سنجش عددی کیفیت بازیابی: recall@5 روی یک مجموعه‌ی سؤال طلایی.
 *
 * هر سؤال به یک یا چند URL واقعی از کورپوس مپ می‌شه (نه ساختگی — همه از
 * `data/chunks.json` واقعی استخراج شدن). recall@5 یعنی: از بین ۵ نتیجه‌ی
 * برتر `hybridSearch`، حداقل یکی از URLهای درستِ همون سؤال هست یا نه.
 *
 * عمداً چندتا سؤال با کلمه‌ی محاوره‌ای «دیپلوی» گذاشته شده (نه «استقرار»
 * که خود مستندات می‌نویسه) تا SYNONYMS در normalize-fa.ts واقعاً تست بشه،
 * نه فقط با موفقیت روی سؤال‌های راحت خودمون رو گول بزنیم.
 *
 * اجرا: npx tsx scripts/eval.ts
 */

import { hybridSearch } from "../lib/retrieval/search";

interface GoldenQuestion {
  query: string;
  /** هر کدوم از این‌ها در نتایج باشه، hit حساب می‌شه */
  expectedUrlContains: string[];
}

const GOLDEN: GoldenQuestion[] = [
  { query: "چطور با هوش مصنوعی Gemini شروع کنم؟", expectedUrlContains: ["ai/google-gemini"] },
  { query: "چطور توی Next.js متن رو استریم کنم با AI؟", expectedUrlContains: ["ai/cookbook/nextjs/stream-text-with-chat-prompt"] },
  { query: "چطور از NestJS به هوش مصنوعی وصل بشم؟", expectedUrlContains: ["ai/cookbook/api-servers/nest"] },
  { query: "سرویس هوش مصنوعی لیارا چیه؟", expectedUrlContains: ["ai/about"] },
  { query: "چطور در NodeJS با AI متن تولید کنم؟", expectedUrlContains: ["ai/cookbook/nodejs/generate-text-with-chat-prompt"] },
  { query: "تنظیمات AI SDK لیارا چیه؟", expectedUrlContains: ["ai/ai-sdk-core/settings"] },
  { query: "چطور به MariaDB از برنامه‌ی دات‌نت وصل بشم؟", expectedUrlContains: ["dbaas/mariadb/how-tos/connect-via-platform/dotnet"] },
  { query: "چطور با DBeaver به دیتابیس MSSQL وصل بشم؟", expectedUrlContains: ["dbaas/mssql/how-tos/connect-via-gui/dbeaver"] },
  { query: "چطور با MongoDB Compass به دیتابیسم وصل بشم؟", expectedUrlContains: ["dbaas/mongodb/how-tos/connect-via-gui/mongodb-compass"] },
  { query: "چطور به RabbitMQ از Next.js وصل بشم؟", expectedUrlContains: ["dbaas/rabbitmq/how-tos/connect-via-platform/nextjs"] },
  { query: "راه‌اندازی سریع دیتابیس MSSQL چطوریه؟", expectedUrlContains: ["dbaas/mssql/quick-setup"] },
  { query: "چطور پلن پلتفرمم رو توی لیارا عوض کنم؟", expectedUrlContains: ["paas/details/change-plan"] },
  { query: "چطور یک مسیر برای دیسک تعریف کنم؟", expectedUrlContains: ["paas/disks/route"] },
  { query: "چطور از برنامه‌ی دات‌نتم به دیتابیس وصل بشم؟", expectedUrlContains: ["paas/dotnet/how-tos/connect-to-db"] },
  { query: "رجیستری خصوصی لیارا چیه؟", expectedUrlContains: ["paas/details/private-registry"] },
  { query: "خطای ModuleNotFoundError توی Flask یعنی چی؟", expectedUrlContains: ["paas/flask/fix-common-errors/module-not-found"] },
  { query: "چطور متغیرهای Appsmith رو تنظیم کنم؟", expectedUrlContains: ["one-click-apps/appsmith/how-tos/configure-vars"] },
  { query: "چطور به MeiliSearch وصل بشم؟", expectedUrlContains: ["one-click-apps/meilisearch/how-tos/connect"] },
  { query: "چطور نسخه‌ی برنامه‌ی Matomo رو عوض کنم؟", expectedUrlContains: ["one-click-apps/matomo/how-tos/choose-version"] },
  { query: "خطای err_too_many_redirects توی وردپرس یعنی چی؟", expectedUrlContains: ["one-click-apps/wordpress/fix-common-errors/too-many-redirects-error"] },
  { query: "رکورد Wildcard DNS چیه؟", expectedUrlContains: ["dns-management-system/details/wildcard-dns-records"] },
  { query: "چطور دامنه‌ی سفارشی رو به اپ لیارا وصل کنم؟", expectedUrlContains: ["paas/domains/add-domain"] },
  { query: "چطور به ایمیل‌سرور از Laravel وصل بشم؟", expectedUrlContains: ["email-server/how-tos/connect-via-platform/laravel"] },
  { query: "محدودیت‌های ایمیل‌سرور لیارا چیه؟", expectedUrlContains: ["email-server/how-tos/manage-limitations"] },
  { query: "چطور از PHP به فضای ذخیره‌سازی ابری وصل بشم؟", expectedUrlContains: ["object-storage/how-tos/connect-via-platform/php"] },
  { query: "چطور فایل رو از باکت دانلود کنم؟", expectedUrlContains: ["object-storage/how-tos/download-file"] },
  { query: "چطور با Liara CLI دیپلوی کنم؟", expectedUrlContains: ["references/cli/deploy-app"] },
  { query: "چطور با CLI وارد شل برنامه بشم؟", expectedUrlContains: ["references/cli/connect-to-app-shell"] },
  { query: "چطور هزینه‌های حساب کاربریم رو تخمین بزنم؟", expectedUrlContains: ["references/console/cost-estimation"] },
  { query: "منابع سخت‌افزاری لیارا چیه؟", expectedUrlContains: ["iaas/details/hardware-plans", "paas/details/plans/hardware-plans"] },
  { query: "چطور میرور Debian رو تنظیم کنم؟", expectedUrlContains: ["mirrors/debian"] },
  { query: "لیارا اصلا چیه و چیکار می‌کنه؟", expectedUrlContains: ["overview/about"] },
  { query: "دیتاسنترهای لیارا کجان؟", expectedUrlContains: ["overview/data-centers"] },
  { query: "چطور به اعضای تیمم دسترسی بدم؟", expectedUrlContains: ["references/team/grant-access"] },
];

const TOP_K = 5;

async function main() {
  console.log(`در حال اجرای eval روی ${GOLDEN.length} سؤال طلایی (recall@${TOP_K})...\n`);

  const fails: Array<{ query: string; expected: string[]; got: string[] }> = [];
  let hits = 0;

  for (const g of GOLDEN) {
    const results = await hybridSearch(g.query, { topK: TOP_K });
    const gotUrls = results.map((r) => r.chunk.sourceUrl);
    const hit = gotUrls.some((url) => g.expectedUrlContains.some((exp) => url.includes(exp)));
    if (hit) {
      hits++;
    } else {
      fails.push({ query: g.query, expected: g.expectedUrlContains, got: gotUrls });
    }
  }

  const recall = hits / GOLDEN.length;
  console.log(`recall@${TOP_K}: ${hits}/${GOLDEN.length} = ${(recall * 100).toFixed(1)}%\n`);

  if (fails.length > 0) {
    console.log("سؤال‌های ناموفق:\n");
    for (const f of fails) {
      console.log(`  ✗ «${f.query}»`);
      console.log(`    انتظار: ${f.expected.join(" یا ")}`);
      console.log(`    نتایج واقعی:`);
      for (const url of f.got) console.log(`      - ${url}`);
      console.log();
    }
  }

  process.exit(fails.length > 0 && recall < 0.8 ? 1 : 0);
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
