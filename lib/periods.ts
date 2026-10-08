import { toISODate } from "@/lib/format";

export interface Period {
  /** Eerste dag (inclusief), lokale datum. */
  start: Date;
  /** Eerste dag van de volgende periode (exclusief). */
  end: Date;
  /** "YYYY-MM-DD" van start en end, voor queries. */
  startISO: string;
  endISO: string;
  /** Korte omschrijving: "oktober" of "sinds 25 september". */
  label: string;
}

const MONTHS = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * De salarisdag in een gegeven maand. Valt hij in het weekend, dan de
 * werkdag ervoor (zo betalen de meeste werkgevers uit). Bestaat de dag niet
 * (31 februari), dan de laatste dag van de maand.
 */
export function salaryDateInMonth(year: number, monthIndex: number, salaryDay: number): Date {
  const day = Math.min(salaryDay, daysInMonth(year, monthIndex));
  const date = new Date(year, monthIndex, day);
  const weekday = date.getDay(); // 0 = zondag, 6 = zaterdag
  if (weekday === 6) date.setDate(date.getDate() - 1);
  if (weekday === 0) date.setDate(date.getDate() - 2);
  return date;
}

/**
 * De huidige periode: vanaf de laatste salarisdag tot de volgende.
 * Zonder salarisdag: de kalendermaand.
 */
export function currentPeriod(salaryDay: number | null | undefined, today: Date = new Date()): Period {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!salaryDay || salaryDay < 1 || salaryDay > 31) {
    const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
    return { start, end, startISO: toISODate(start), endISO: toISODate(end), label: MONTHS[start.getMonth()] };
  }

  let start = salaryDateInMonth(todayStart.getFullYear(), todayStart.getMonth(), salaryDay);
  if (start > todayStart) {
    start = salaryDateInMonth(todayStart.getFullYear(), todayStart.getMonth() - 1, salaryDay);
  }
  const end = salaryDateInMonth(start.getFullYear(), start.getMonth() + 1, salaryDay);

  return {
    start,
    end,
    startISO: toISODate(start),
    endISO: toISODate(end),
    label: `sinds ${start.getDate()} ${MONTHS[start.getMonth()]}`,
  };
}

/** De periode vóór de huidige, voor vergelijkingen. */
export function previousPeriod(salaryDay: number | null | undefined, today: Date = new Date()): Period {
  const current = currentPeriod(salaryDay, today);
  const dayBefore = new Date(current.start);
  dayBefore.setDate(dayBefore.getDate() - 1);
  return currentPeriod(salaryDay, dayBefore);
}
