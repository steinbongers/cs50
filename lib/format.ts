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

/** € 12,34 — altijd met twee decimalen. */
export function formatEuro(amount: number): string {
  return currencyFormatter.format(amount);
}

/** € 12 — zonder decimalen, voor grote cijfers op het overzicht. */
export function formatEuroWhole(amount: number): string {
  return wholeCurrencyFormatter.format(amount);
}

/** Bedrag zonder teken, voor weergave naast een kleur die het teken al aangeeft. */
export function formatEuroAbs(amount: number): string {
  return currencyFormatter.format(Math.abs(amount));
}

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "do 3 okt" */
export function formatDay(date: Date | string): string {
  return dayFormatter.format(typeof date === "string" ? parseISODate(date) : date);
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
