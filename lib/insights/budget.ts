/**
 * Pure helpers voor budget en spaardoel van een potje: stand en label.
 * Geen database; alles testbaar. Bedragen in labels in hele euro's.
 */
import { formatEuroWhole } from "@/lib/format";

export interface BudgetStatus {
  /** Gevuld deel van de balk, afgekapt op 0..1. */
  ratio: number;
  /** Wat er nog over is (nooit negatief). */
  left: number;
  /** Hoeveel je over je budget bent (nooit negatief). */
  over: number;
  /** 'over' zodra je meer uitgaf dan het budget; precies op het budget is nog 'ok'. */
  state: "ok" | "over";
}

export interface GoalStatus {
  /** Gevuld deel van de balk, afgekapt op 0..1. */
  ratio: number;
  /** Wat er nog nodig is (nooit negatief). */
  left: number;
  reached: boolean;
  /** Ingevoerde waarden, voor het label. */
  saved: number;
  goal: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/**
 * Budgetstand. Een budget van 0 of minder bestaat niet (de database staat het
 * niet toe); daarom gooit deze functie dan een RangeError.
 */
export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (!Number.isFinite(budget) || budget <= 0) throw new RangeError("Budget moet groter dan 0 zijn.");
  const s = Number.isFinite(spent) ? spent : 0;
  const over = round2(Math.max(0, s - budget));
  return {
    ratio: clamp01(s / budget),
    left: round2(Math.max(0, budget - s)),
    over,
    state: over > 0 ? "over" : "ok",
  };
}

/** Spaardoelstand. Een doel van 0 of minder bestaat niet; dan een RangeError. */
export function goalStatus(saved: number, goal: number): GoalStatus {
  if (!Number.isFinite(goal) || goal <= 0) throw new RangeError("Doel moet groter dan 0 zijn.");
  const s = Number.isFinite(saved) ? saved : 0;
  return {
    ratio: clamp01(s / goal),
    left: round2(Math.max(0, goal - s)),
    reached: s >= goal,
    saved: round2(s),
    goal,
  };
}

/** "Nog € 88" of "€ 14 over je budget". Minder dan een euro over: "€ 1 over je budget", nooit "€ 0 over". */
export function budgetLabel(status: BudgetStatus): string {
  if (status.state === "over") return `${formatEuroWhole(Math.max(1, status.over))} over je budget`;
  return `Nog ${formatEuroWhole(status.left)}`;
}

/** "€ 340 van € 1.000 · nog € 660" of "Doel gehaald. Netjes.". */
export function goalLabel(status: GoalStatus): string {
  if (status.reached) return "Doel gehaald. Netjes.";
  return `${formatEuroWhole(Math.max(0, status.saved))} van ${formatEuroWhole(status.goal)} · nog ${formatEuroWhole(Math.max(1, status.left))}`;
}
