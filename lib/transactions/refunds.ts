/**
 * Geld terug bijhouden zonder vooraf te verdelen. Een uitgave "wacht op geld terug";
 * elke binnengekomen terugbetaling wijst naar die uitgave en gaat van hetzelfde potje af.
 * Is alles binnen, dan is de rest van jou. Puur rekenwerk, geen React en geen database.
 */

import { formatEuro } from "@/lib/format";

/** Een uitgave die nog op geld terug wacht, met wat er al binnen is. */
export interface AwaitingRefund {
  id: string;
  counterparty: string;
  bookingDate: string;
  /** Uitgegeven bedrag, positief. */
  amount: number;
  categoryId: string;
  categoryName: string;
  /** Al terug: de som van de gekoppelde terugbetalingen, positief. */
  received: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Hoofdletterongevoelige bevat-match tussen een naam en de tegenpartij, in beide richtingen. */
export function nameMatches(personName: string | null, counterparty: string): boolean {
  const name = personName?.trim().toLowerCase();
  const other = counterparty.trim().toLowerCase();
  if (!name || !other) return false;
  return other.includes(name) || name.includes(other);
}

/** Per uitgave hoeveel er al terug is, uit de terugbetalingen die ernaar wijzen. */
export function receivedPerExpense(rows: { refundForId: string | null; amount: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.refundForId || !(row.amount > 0)) continue;
    totals.set(row.refundForId, round2((totals.get(row.refundForId) ?? 0) + row.amount));
  }
  return totals;
}

export interface RefundOutcome {
  /** Al terug plus wat er nu binnenkomt. */
  received: number;
  /** Wat er overblijft voor jou als dit alles is (nooit negatief). */
  own: number;
  /** Er is evenveel of meer terug dan je uitgaf. */
  complete: boolean;
}

/** "Al terug € 30 + nu € 30 = € 60. Dan is € 30 van jou." in getallen. */
export function refundOutcome(expenseAmount: number, receivedBefore: number, incoming: number): RefundOutcome {
  const spent = Math.abs(expenseAmount);
  const received = round2(Math.max(0, receivedBefore) + Math.max(0, incoming));
  return { received, own: Math.max(0, round2(spent - received)), complete: received >= spent };
}

/**
 * Meest waarschijnlijke uitgave eerst: tegenpartij die overeenkomt met wat er binnenkomt
 * (tegenpartij of omschrijving), daarna de nieuwste. We kiezen niets voor de gebruiker.
 */
export function orderRefundCandidates<T extends { counterparty: string; bookingDate: string }>(
  expenses: readonly T[],
  incoming: { counterparty: string; description?: string | null },
): T[] {
  const texts = [incoming.counterparty, incoming.description ?? ""].filter((t) => t.trim() !== "");
  return expenses
    .map((expense, index) => ({
      expense,
      index,
      match: texts.some((text) => nameMatches(expense.counterparty, text)),
    }))
    .sort(
      (a, b) =>
        Number(b.match) - Number(a.match) ||
        b.expense.bookingDate.localeCompare(a.expense.bookingDate) ||
        a.index - b.index,
    )
    .map((c) => c.expense);
}

/** "€ 30,00 van € 90,00 terug" */
export function refundProgressText(received: number, amount: number): string {
  return `${formatEuro(received)} van ${formatEuro(Math.abs(amount))} terug`;
}

/** De som in de vraag "Is alles binnen?". Zonder eerdere terugbetaling geen optelling. */
export function refundMathText(expenseAmount: number, receivedBefore: number, incoming: number): string {
  const spent = Math.abs(expenseAmount);
  const outcome = refundOutcome(spent, receivedBefore, incoming);
  const sum =
    receivedBefore > 0
      ? `Al terug ${formatEuro(receivedBefore)} + nu ${formatEuro(incoming)} = ${formatEuro(outcome.received)}.`
      : `Nu ${formatEuro(incoming)} terug.`;
  if (!outcome.complete) return `${sum} Dan is ${formatEuro(outcome.own)} van jou.`;
  const extra = round2(outcome.received - spent);
  return extra > 0
    ? `${sum} Dat is ${formatEuro(extra)} meer dan je uitgaf.`
    : `${sum} Dat is alles wat je uitgaf.`;
}

/** Tekst in de pil na het koppelen: "€ 30,00 terug voor Uit eten · nog open". Met schatting: jouw deel. */
export function refundUndoText(incoming: number, categoryName: string, complete: boolean, estimate?: number): string {
  const state = !complete
    ? "nog open"
    : estimate !== undefined
      ? `klaar, jouw deel ${formatEuro(estimate)}`
      : "klaar, de rest is van jou";
  return `${formatEuro(incoming)} terug voor ${categoryName} · ${state}`;
}

/**
 * Een deel kwam buiten de bank terug: de gebruiker schat zelf hoeveel hij uitgaf. Geldig is een
 * bedrag in centen van € 0 tot en met het hele bedrag van de uitgave.
 */
export function isValidEstimate(estimate: unknown, expenseAmount: number): estimate is number {
  if (typeof estimate !== "number" || !Number.isFinite(estimate)) return false;
  if (Math.abs(Math.round(estimate * 100) - estimate * 100) > 1e-6) return false;
  return estimate >= 0 && estimate <= Math.abs(expenseAmount);
}

/**
 * own_share van de uitgave zodat het potje precies de schatting telt. spendOf telt de uitgave
 * als own_share en elke gekoppelde terugbetaling (inkomend, in hetzelfde potje) als −bedrag:
 * own_share − al terug via de bank = schatting, dus own_share = schatting + al terug.
 */
export function estimatedOwnShare(estimate: number, receivedViaBank: number): number {
  return round2(Math.max(0, estimate) + Math.max(0, receivedViaBank));
}

/** Voorinvulling van het schattingsveld: wat er nu van jou zou zijn, als "60" of "60,50". */
export function estimateInputValue(expenseAmount: number, received: number): string {
  const own = refundOutcome(expenseAmount, received, 0).own;
  return Number.isInteger(own) ? String(own) : own.toFixed(2).replace(".", ",");
}
