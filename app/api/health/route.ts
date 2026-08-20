import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startedAt = Date.now();

/**
 * وضعیت سرویس. توسط healthCheck در liara.json و برای دیباگ استفاده می‌شه.
 * عمداً هیچ جزئیات حساسی (کلید، مسیر فایل، استک‌تریس) برنمی‌گردونه.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    // فقط پیکربندی‌شدن یا نشدن رو گزارش می‌کنیم، نه خود مقدار رو
    config: {
      aiConfigured: Boolean(process.env.BASE_URL && process.env.LIARA_API_KEY),
      index: "pending",
    },
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
