/**
 * لاگ ساخت‌یافته‌ی JSON روی stdout.
 *
 * لیارا لاگ اپ رو از stdout جمع می‌کنه (`liara logs`)، پس نیازی به
 * فایل یا سرویس خارجی نیست. فرمت JSON تک‌خطی انتخاب شده تا اگه لازم شد
 * بعداً به یک ابزار agregation وصل بشه، parse کردنش رایگان باشه.
 */

type Level = "info" | "warn" | "error";

interface LogFields {
  requestId?: string;
  route?: string;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  cacheHit?: boolean;
  [key: string]: unknown;
}

function log(level: Level, message: string, fields: LogFields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => log("info", message, fields),
  warn: (message: string, fields?: LogFields) => log("warn", message, fields),
  /**
   * برای خطاها هرگز آبجکت خطای خام (با stack کامل) رو مستقیم به کلاینت
   * برنگردون؛ فقط اینجا لاگش کن. `route.ts` این تفکیک رو رعایت می‌کنه.
   */
  error: (message: string, fields?: LogFields) => log("error", message, fields),
};

export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}
