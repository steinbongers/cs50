import { merchantTokens } from "./wallet";

/**
 * Voorstel voor een potje in de melding: het potje dat de gebruiker zelf het vaakst koos bij
 * dezelfde winkel. Bewuste afwijking van het productplan (11 november 2026, Stein): het is een
 * voorstel, geen indeling. Niets gaat in een potje zonder een tik van de gebruiker.
 * Geen eerdere keuze bij deze winkel: geen voorstel.
 */

export const SUGGEST_HISTORY_DAYS = 90;

export interface HistoryRow {
  category_id: string;
  counterparty: string | null;
  wallet_merchant: string | null;
  categorized_at: string | null;
}

export function merchantKey(name: string | null | undefined): string {
  return merchantTokens(name).join(" ");
}

/**
 * `allowed`: potjes die nu gekozen mogen worden (niet gearchiveerd, geen systeempotje).
 * Gelijkspel: het potje dat het laatst gekozen is.
 */
export function pickSuggestion(
  history: readonly HistoryRow[],
  merchant: string | null | undefined,
  allowed: ReadonlySet<string>,
): string | null {
  const key = merchantKey(merchant);
  if (!key) return null;
  const tally = new Map<string, { count: number; last: number }>();
  for (const row of history) {
    if (!allowed.has(row.category_id)) continue;
    if (merchantKey(row.counterparty) !== key && merchantKey(row.wallet_merchant) !== key) continue;
    const t = tally.get(row.category_id) ?? { count: 0, last: 0 };
    t.count++;
    t.last = Math.max(t.last, row.categorized_at ? Date.parse(row.categorized_at) || 0 : 0);
    tally.set(row.category_id, t);
  }
  let best: string | null = null;
  let bestScore = { count: 0, last: -1 };
  for (const [id, score] of tally) {
    if (score.count > bestScore.count || (score.count === bestScore.count && score.last > bestScore.last)) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/** De meestgebruikte potjes (voor de knoppen op de grote widget), hoogstens `limit`. */
export function topCategories(
  used: readonly { category_id: string }[],
  allowedInOrder: readonly string[],
  limit: number,
): string[] {
  const allowed = new Set(allowedInOrder);
  const counts = new Map<string, number>();
  for (const row of used) if (allowed.has(row.category_id)) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  // Aanvullen met de eigen volgorde van de potjes, voor een nieuwe gebruiker zonder geschiedenis.
  for (const id of allowedInOrder) if (!ranked.includes(id)) ranked.push(id);
  return ranked.slice(0, limit);
}
