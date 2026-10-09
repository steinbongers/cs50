/**
 * Pure teksten voor de Inkomsten-weergave en Meer inzicht. Neutraal: geen groen of
 * amber in de woorden, geen oordeel. Kopjes zeggen wat je uit de grafiek haalt.
 */
import { AVERAGE_TOLERANCE } from "@/components/overview/overview-copy";
import { formatEuroWhole } from "@/lib/format";
import type { FlowAverage, IncomeComparison } from "@/lib/insights/charts";

const WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
export const WEEKDAYS_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export function weekdayName(index: number): string {
  return WEEKDAYS[index] ?? "";
}

/** "okt", "mei", "jun": voor krappe labels onder een grafiek. */
export function shortMonth(name: string): string {
  return name.slice(0, 3);
}

const MINUS = "−";
const NBSP = " ";

/** Compact bedrag voor een as of een klein label: "€ 230", "€ 1,2k", "− € 40". */
export function compactEuro(amount: number): string {
  const size = Math.abs(amount);
  const sign = Math.round(amount) < 0 ? `${MINUS}${NBSP}` : "";
  if (size < 1000) return `${sign}€${NBSP}${Math.round(size)}`;
  const k = Math.round(size / 100) / 10;
  return `${sign}€${NBSP}${String(k).replace(".", ",")}k`;
}

/** "Op basis van 1 maand" of "Op basis van 3 maanden". */
export function basisText(periods: number): string {
  return periods === 1 ? "Op basis van 1 maand" : `Op basis van ${periods} maanden`;
}

/** "Inkomsten − uitgaven: € 230 over" of "€ 40 meer uitgegeven dan binnenkwam". */
export function netLine(net: number): string {
  const rounded = Math.round(net);
  if (rounded >= 0) return `Inkomsten ${MINUS} uitgaven: ${formatEuroWhole(rounded)} over`;
  return `${formatEuroWhole(-rounded)} meer uitgegeven dan binnenkwam`;
}

/** Inkomsten tegenover je gemiddelde, of een uitleg zonder eerdere maanden. */
export function incomeCompareText(comparison: IncomeComparison, isCurrent: boolean): { text: string; basis: string | null } {
  if (comparison.average === null || comparison.periodsUsed === 0) {
    return { text: "Nog geen eerdere maanden om mee te vergelijken.", basis: null };
  }
  const basis = comparison.periodsUsed < 3 ? basisText(comparison.periodsUsed) : null;
  const diff = comparison.current - comparison.average;
  const size = Math.abs(diff);
  if (size <= AVERAGE_TOLERANCE * comparison.average || Math.round(size) < 1) {
    return { text: "Net als je gemiddelde", basis };
  }
  const suffix = isCurrent ? " tot nu toe" : "";
  return { text: `${formatEuroWhole(size)} ${diff > 0 ? "meer" : "minder"} dan je gemiddelde${suffix}`, basis };
}

/** Kop van "Inkomsten en uitgaven": wat er gemiddeld overblijft. */
export function flowTitle(average: FlowAverage | null, currentNet: number): string {
  if (average) {
    const net = Math.round(average.net);
    return net >= 0
      ? `Gemiddeld hou je ${formatEuroWhole(net)} per maand over`
      : `Gemiddeld geef je ${formatEuroWhole(-net)} per maand meer uit dan er binnenkomt`;
  }
  const net = Math.round(currentNet);
  return net >= 0
    ? `Deze maand hou je tot nu toe ${formatEuroWhole(net)} over`
    : `Deze maand gaf je tot nu toe ${formatEuroWhole(-net)} meer uit dan er binnenkwam`;
}

/** Kop van "Deze maand tot nu": tegenover je gemiddelde op hetzelfde punt. */
export function cumulativeTitle(current: number, average: number | null, monthName: string): string {
  if (average === null) return `Je gaf in ${monthName} tot nu toe ${formatEuroWhole(current)} uit`;
  const diff = current - average;
  const size = Math.abs(diff);
  if (size <= AVERAGE_TOLERANCE * average || Math.round(size) < 1) return "Je zit precies rond je gemiddelde";
  return `Je gaf in ${monthName} ${formatEuroWhole(size)} ${diff > 0 ? "meer" : "minder"} uit dan gemiddeld`;
}

/** "Op zaterdag geef je het meest uit". */
export function weekdayTitle(maxIndex: number): string {
  return `Op ${weekdayName(maxIndex)} geef je het meest uit`;
}

/** "Vaste lasten zijn 38% van je uitgaven". */
export function fixedTitle(share: number): string {
  const percent = Math.round(share * 100);
  return percent >= 100 ? "Je uitgaven zijn bijna alleen vaste lasten" : `Vaste lasten zijn ${percent}% van je uitgaven`;
}
