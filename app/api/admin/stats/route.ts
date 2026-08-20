import { NextResponse } from "next/server";
import { getUsageSummary } from "../../../../lib/usage";
import { getCacheStats } from "../../../../lib/cache";
import { logger } from "../../../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * آمار مصرف/هزینه/کش برای `/admin`. عمداً پشت یک توکن ثابت (نه چیز
 * فانتزی مثل session) چون این فقط یک داشبورد داخلی تک‌کاربره برای دموی
 * هکاتونه، ولی همچنان نباید بدون احراز هویت عمومی باشه — این دقیقاً
 * همون داده‌ایه که معیار «امنیت» می‌خواد نشتش ندیم.
 */
export async function GET(req: Request) {
  const configuredToken = process.env.ADMIN_TOKEN;
  if (!configuredToken) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN تنظیم نشده — داشبورد ادمین غیرفعاله." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("token") ?? "";

  if (provided !== configuredToken) {
    logger.warn("admin auth failed", { route: "admin/stats" });
    return NextResponse.json({ error: "دسترسی نداری." }, { status: 401 });
  }

  return NextResponse.json({
    usage: getUsageSummary(),
    cache: getCacheStats(),
  });
}
