import { DEFAULT_CURRENCY, LOCALE } from "@/config/app";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Negatieve nul en afrondrestjes (|x| < 0,005) tonen we als gewone nul, nooit als "€ -0,00". */
function zeroSafe(amount: number): number {
  return Math.abs(amount) < 0.005 ? 0 : amount;
}

/** € 12,34 — altijd met twee decimalen. */
export function formatEuro(amount: number): string {
  return currencyFormatter.format(zeroSafe(amount));
}

/** € 12 — zonder decimalen, voor grote cijfers op het overzicht. */
export function formatEuroWhole(amount: number): string {
  // Alles wat op € 0 afrondt, ook -0,4, tonen als € 0 zonder minteken.
  return wholeCurrencyFormatter.format(Math.round(amount) === 0 ? 0 : amount);
}

/** Bedrag zonder teken, voor weergave naast een kleur die het teken al aangeeft. */
export function formatEuroAbs(amount: number): string {
  return currencyFormatter.format(Math.abs(zeroSafe(amount)));
}

/** "− € 23,45" of "+ € 12,50": expliciet teken, echte minus. */
export function formatSignedEuro(amount: number): string {
  const sign = amount < 0 ? "\u2212 " : amount > 0 ? "+ " : "";
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`;
}

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "Europe/Amsterdam",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: "Europe/Amsterdam",
  hour: "2-digit",
  minute: "2-digit",
});

const amsterdamDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Amsterdam",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "3 okt", zonder weekdag: voor krappe labels zoals een grafiek-as. */
export function formatDayShort(date: Date | string): string {
  return shortDayFormatter.format(typeof date === "string" ? parseISODate(date) : date);
}

/**
 * Tijdstip in Amsterdamse tijd: "14:32" als het vandaag is, anders "3 oktober, 14:32".
 * Voor "Bijgewerkt om ..." en vergelijkbare momenten.
 */
export function formatDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const isToday = amsterdamDateFormatter.format(value) === amsterdamDateFormatter.format(new Date());
  if (isToday) return timeFormatter.format(value);
  const parts = dateTimeFormatter.formatToParts(value);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${day} ${month}, ${hour}:${minute}`;
}

/** "do 3 okt" */
export function formatDay(date: Date | string): string {
  return dayFormatter.format(typeof date === "string" ? parseISODate(date) : date);
}

/** "Donderdag 8 oktober", met hoofdletter. */
export function formatLongDay(date: Date | string): string {
  const text = longDayFormatter.format(typeof date === "string" ? parseISODate(date) : date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "3 oktober 2026" */
export function formatLongDate(date: Date | string): string {
  return longDateFormatter.format(typeof date === "string" ? parseISODate(date) : date);
}

/** Parseert "YYYY-MM-DD" als lokale datum (geen tijdzoneverschuiving). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** "YYYY-MM-DD" van een Date, in lokale tijd. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
