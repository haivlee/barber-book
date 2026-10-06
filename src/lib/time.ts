import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { shop } from "@/config/shop";

const TZ = shop.timeZone;

/** "yyyy-MM-dd" for the current day in the shop's time zone. */
export function todayKey(now: Date = new Date()): string {
  return format(new TZDate(now, TZ), "yyyy-MM-dd");
}

export function addDaysKey(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey);
  return format(addDays(d, days), "yyyy-MM-dd");
}

/** Midnight of a "yyyy-MM-dd" day in the shop's time zone. */
export function parseDateKey(dateKey: string): TZDate {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new TZDate(y, m - 1, d, 0, 0, 0, TZ);
}

/** Absolute instant for "yyyy-MM-dd" + "HH:mm" interpreted in the shop's time zone. */
export function shopDateTime(dateKey: string, hhmm: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, TZ).getTime());
}

export function weekdayOf(dateKey: string): number {
  return parseDateKey(dateKey).getDay();
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseDateKey(value);
  return !Number.isNaN(d.getTime()) && format(d, "yyyy-MM-dd") === value;
}

export function formatInShop(date: Date | string | number, pattern: string): string {
  return format(new TZDate(new Date(date), TZ), pattern);
}

export function formatTime(date: Date | string | number): string {
  return formatInShop(date, "h:mm a");
}

export function formatDateLong(date: Date | string | number): string {
  return formatInShop(date, "EEEE, MMMM d");
}

export function formatDateKeyLong(dateKey: string): string {
  return format(parseDateKey(dateKey), "EEEE, MMMM d");
}

export function hhmmToLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
