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
 * De kalenderdag van dit moment in Europe/Amsterdam, als lokale Date op
 * middernacht. Servers draaien in UTC; rond middernacht zou "vandaag" anders
 * een dag verschillen van wat de gebruiker ziet.
 */
export function amsterdamToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "2026-10-08"
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * De huidige periode: vanaf de laatste salarisdag tot de volgende.
 * Zonder salarisdag: de kalendermaand.
 *
 * De salarisdag kan door de weekendregel in de vorige maand vallen (1 augustus
 * op zaterdag wordt 31 juli). Daarom kijken we naar de kandidaten van de
 * maand ervoor, deze maand en de maand erna: de start is de laatste kandidaat
 * op of voor vandaag, het einde de kandidaat van de nominale maand erna.
 */
export function currentPeriod(salaryDay: number | null | undefined, today: Date = new Date()): Period {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!salaryDay || salaryDay < 1 || salaryDay > 31) {
    const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
    const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);
    return { start, end, startISO: toISODate(start), endISO: toISODate(end), label: MONTHS[start.getMonth()] };
  }

  const year = todayStart.getFullYear();
  const month = todayStart.getMonth();
  // Nominale maand van de start (offset t.o.v. deze maand); de kandidaat van
  // de maand ervoor ligt altijd op of voor vandaag.
  let startOffset = -1;
  for (const offset of [0, 1]) {
    if (salaryDateInMonth(year, month + offset, salaryDay) <= todayStart) startOffset = offset;
  }
  const start = salaryDateInMonth(year, month + startOffset, salaryDay);
  const end = salaryDateInMonth(year, month + startOffset + 1, salaryDay);

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
