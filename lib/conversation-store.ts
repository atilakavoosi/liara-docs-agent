/**
 * تاریخچه‌ی گفتگوها — فقط سمت مرورگر (localStorage)، بدون لاگین یا سرور.
 *
 * چرا localStorage نه بک‌اند: PROJECT.md صراحتاً «تاریخچه‌ی ماندگار بین
 * دستگاه‌ها» رو حذف کرده چون نیاز به حساب کاربری داره (ADR: نگاه
 * docs/DECISIONS.md). این یک چیز دیگه‌ست — تاریخچه‌ی *همون مرورگر*، دقیقاً
 * همون الگویی که پروفایل کاربر (`chat-shell.tsx`) از قبل داره. صفر زیرساخت
 * جدید، صفر نقض اون تصمیم.
 */

import { isTextUIPart, type UIMessage } from "ai";

export interface ConversationRecord {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
}

const STORAGE_KEY = "liarayar:conversations";
const MAX_CONVERSATIONS = 20;
const TITLE_MAX_LEN = 42;

function readAll(): ConversationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConversationRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: ConversationRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // فضای localStorage پر بوده یا در دسترس نیست — فقط تاریخچه ذخیره نمی‌شه،
    // خود گفتگو مختل نمی‌شه
  }
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser?.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return "گفتگوی جدید";
  return text.length > TITLE_MAX_LEN ? `${text.slice(0, TITLE_MAX_LEN)}…` : text;
}

export function listConversations(): ConversationRecord[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadConversation(id: string): UIMessage[] | null {
  return readAll().find((c) => c.id === id)?.messages ?? null;
}

/** فقط وقتی حداقل یک پیام هست ذخیره می‌شه — گفتگوی خالی وارد تاریخچه نمی‌شه */
export function saveConversation(id: string, messages: UIMessage[]): void {
  if (messages.length === 0) return;
  const records = readAll().filter((c) => c.id !== id);
  records.push({ id, title: deriveTitle(messages), updatedAt: Date.now(), messages });
  records.sort((a, b) => b.updatedAt - a.updatedAt);
  writeAll(records.slice(0, MAX_CONVERSATIONS));
}

export function deleteConversation(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function newConversationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
