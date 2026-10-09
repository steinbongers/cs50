/**
 * Pure teksten voor het overzicht: maandtitel, ondertitel en de vergelijking met
 * je gemiddelde. Geen React, geen database; alles in hele euro's.
 */
import { formatDayShort, formatEuroWhole } from "@/lib/format";
import type { Comparison } from "@/lib/insights/compute";
import type { Period } from "@/lib/periods";

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Binnen dit deel van het gemiddelde heet het "precies rond je gemiddelde". */
export const AVERAGE_TOLERANCE = 0.1;
/** Vóór deze dag van de maand zegt een vergelijking nog niets. */
export const COMPARE_MIN_DAYS = 3;

function dayDiff(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 864e5);
}

/**
 * De maandnaam van een periode, in kleine letters. Een salarisperiode van 25 september
 * tot 24 oktober heet "oktober": de maand waar de meeste dagen in vallen.
 */
export function periodMonthName(period: Period): string {
  const length = Math.max(1, dayDiff(period.start, period.end));
  const middle = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate() + Math.floor(length / 2));
  return MONTHS[middle.getMonth()];
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Lopende maand: "Sinds 25 sep · nog 17 dagen" (zonder salarisdag alleen "nog 17 dagen").
 * Vorige maand: "25 aug – 24 sep".
 */
export function periodSubtitle(period: Period, today: Date, isCurrent: boolean, hasSalaryDay: boolean): string {
  if (!isCurrent) {
    const lastDay = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate() - 1);
    return `${formatDayShort(period.start)} – ${formatDayShort(lastDay)}`;
  }
  const left = Math.max(0, dayDiff(today, period.end));
  const rest = left === 1 ? "nog 1 dag" : `nog ${left} dagen`;
  return hasSalaryDay ? `Sinds ${formatDayShort(period.start)} · ${rest}` : rest;
}

export type CompareLine =
  | { kind: "chip"; tone: "positive" | "accent" | "neutral"; text: string; basis: string | null }
  | { kind: "note"; text: string };

/**
 * Eén regel tegenover je gemiddelde tot nu toe, of null (vóór dag 3, of geen vergelijking).
 * Zonder vorige maanden: een uitleg in plaats van een chip.
 */
export function compareLine(comparison: Comparison | null): CompareLine | null {
  if (!comparison || comparison.daysElapsed < COMPARE_MIN_DAYS) return null;
  if (comparison.periodsUsed === 0 || comparison.average === null) {
    return { kind: "note", text: "Je eerste maand. Vanaf volgende maand zie je hier je gemiddelde." };
  }
  // Bij weinig historie een losse regel onder de chip, zodat de chip op één regel past.
  const basis =
    comparison.periodsUsed === 1 ? "Op basis van 1 maand" : comparison.periodsUsed === 2 ? "Op basis van 2 maanden" : null;
  const diff = comparison.current - comparison.average;
  const size = Math.abs(diff);
  if (size <= AVERAGE_TOLERANCE * comparison.average || Math.round(size) < 1) {
    return { kind: "chip", tone: "neutral", text: "Precies rond je gemiddelde", basis };
  }
  return diff < 0
    ? { kind: "chip", tone: "positive", text: `${formatEuroWhole(size)} minder dan je gemiddelde tot nu toe`, basis }
    : { kind: "chip", tone: "accent", text: `${formatEuroWhole(size)} meer dan je gemiddelde tot nu toe`, basis };
}

/** "9 kaartjes wachten" of "1 kaartje wacht". */
export function openCardsText(count: number): string {
  return count === 1 ? "1 kaartje wacht" : `${count} kaartjes wachten`;
}

/** "Vrij tot de 25e": de dag van de volgende salarisdag ("YYYY-MM-DD"). */
export function freeUntilLabel(untilISO: string): string {
  return `Vrij tot de ${Number(untilISO.slice(8, 10))}e`;
}

/** "Je betaalt € 47 per maand aan 6 vaste lasten." */
export function recurringSummary(total: number, count: number): string {
  return `Je betaalt ${formatEuroWhole(total)} per maand aan ${count} ${count === 1 ? "vaste last" : "vaste lasten"}.`;
}

/** "Meestal rond de 28e". */
export function usualDayText(day: number): string {
  return `Meestal rond de ${day}e`;
}

/** Neutraal verschil met de week ervoor: geen groen, geen amber, geen oordeel. */
export function weekDiffText(spent: number, previous: number): string {
  if (previous <= 0) return "De week ervoor niets";
  const diff = Math.round(spent - previous);
  if (diff === 0) return "Net als de week ervoor";
  return `${formatEuroWhole(Math.abs(diff))} ${diff > 0 ? "meer" : "minder"} dan de week ervoor`;
}
