import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Zoeken in je eigen transacties (/transacties).
 * Geen "server-only": de pure helpers (sanitizeQuery, groupByDay) zijn ook in tests
 * en clientcode te gebruiken. De zoekfunctie krijgt de Supabase-client mee.
 */

/** Minimale lengte van een zoekterm na opschonen. */
export const MIN_QUERY_LENGTH = 2;

/** Zoveel resultaten tonen we hooguit; daarna vraag je specifieker. */
export const SEARCH_LIMIT = 200;

/**
 * Tekens die in een PostgREST `or`-filter of een `ilike`-patroon iets betekenen
 * (scheidingsteken, groepering, jokers, escape) plus het aanhalingsteken. Die halen
 * we weg, zodat een zoekterm nooit het filter kan openbreken.
 */
const UNSAFE_CHARS = /[,()*%_\\"]/g;

/**
 * Schoont een zoekterm op: trimt, haalt `,()*%_\` (en `"`) weg en zet om naar kleine
 * letters. Geeft null als er minder dan twee tekens overblijven.
 */
export function sanitizeQuery(q: string | null | undefined): string | null {
  if (typeof q !== "string") return null;
  const cleaned = q.replace(UNSAFE_CHARS, "").replace(/\s+/g, " ").trim().toLowerCase();
  return [...cleaned].length >= MIN_QUERY_LENGTH ? cleaned : null;
}

/** Eén resultaat, alleen wat de lijst en de sheet nodig hebben. */
export interface SearchResult {
  id: string;
  bookingDate: string;
  /** "14:32" of null als de bank geen tijd meestuurde. */
  bookingTime: string | null;
  amount: number;
  ownShare: number | null;
  counterparty: string;
  description: string | null;
  rawCounterparty: string | null;
  rawDescription: string | null;
  note: string | null;
  categoryId: string | null;
  /** Contante uitgave (geen rekening, geen banktekst). */
  isCash: boolean;
  /** Uitgave die nog op geld terug wacht. */
  awaitingRefund: boolean;
  /** Terugbetaling: tegenpartij van de uitgave waar hij bij hoort, anders null. */
  refundFor: string | null;
}

export interface SearchOptions {
  /** Ruwe of al opgeschoonde zoekterm; wordt hier (opnieuw) opgeschoond. */
  q?: string | null;
  categoryId?: string | null;
  /** Eerste dag (inclusief), "YYYY-MM-DD". */
  from?: string | null;
  /** Eerste dag erna (exclusief), "YYYY-MM-DD". */
  to?: string | null;
  limit?: number;
}

/**
 * Zoekt in de eigen transacties (RLS) op tegenpartij, omschrijving en notitie,
 * met optioneel een potje en een datumbereik. Eigen overboekingen tussen
 * gekoppelde rekeningen blijven weg, net als op de stapel. Nieuwste eerst.
 */
export async function searchTransactions(
  supabase: SupabaseClient<Database>,
  { q, categoryId, from, to, limit = SEARCH_LIMIT }: SearchOptions = {},
): Promise<SearchResult[]> {
  let query = supabase
    .from("transactions")
    .select(
      "id, booking_date, booking_time, amount, own_share, counterparty, description, raw_counterparty, raw_description, note, category_id, source, awaiting_refund, refund_for_id",
    )
    .eq("is_internal_transfer", false);

  const term = sanitizeQuery(q);
  if (term) {
    query = query.or(`counterparty.ilike.*${term}*,description.ilike.*${term}*,note.ilike.*${term}*`);
  }
  if (categoryId) query = query.eq("category_id", categoryId);
  if (from) query = query.gte("booking_date", from);
  if (to) query = query.lt("booking_date", to);

  const { data, error } = await query
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, SEARCH_LIMIT)));

  // Geen banktekst of zoekterm in de foutmelding: alleen dat het misging.
  if (error) throw new Error("Zoeken lukte niet.");

  // Bij terugbetalingen de uitgave erbij (één extra query, alleen als er zulke regels zijn).
  const targetIds = [...new Set((data ?? []).flatMap((t) => (t.refund_for_id ? [t.refund_for_id] : [])))];
  const targets = new Map<string, string>();
  if (targetIds.length > 0) {
    const { data: rows } = await supabase.from("transactions").select("id, counterparty").in("id", targetIds);
    for (const row of rows ?? []) targets.set(row.id, row.counterparty?.trim() || "Onbekende tegenpartij");
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    bookingDate: t.booking_date,
    bookingTime: t.booking_time ? t.booking_time.slice(0, 5) : null,
    amount: Number(t.amount),
    ownShare: t.own_share === null ? null : Number(t.own_share),
    counterparty: t.counterparty?.trim() || "Onbekende tegenpartij",
    description: t.description?.trim() || null,
    rawCounterparty: t.raw_counterparty,
    rawDescription: t.raw_description,
    note: t.note?.trim() || null,
    categoryId: t.category_id,
    isCash: t.source === "cash",
    awaitingRefund: t.awaiting_refund,
    refundFor: t.refund_for_id ? (targets.get(t.refund_for_id) ?? "een uitgave") : null,
  }));
}

export interface DayGroup<T> {
  /** "YYYY-MM-DD" */
  date: string;
  rows: T[];
}

/**
 * Groepeert rijen per boekingsdatum. De volgorde van de dagen en van de rijen
 * binnen een dag blijft zoals hij binnenkwam (de query sorteert al).
 */
export function groupByDay<T extends { bookingDate: string }>(rows: readonly T[]): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const byDate = new Map<string, DayGroup<T>>();
  for (const row of rows) {
    let group = byDate.get(row.bookingDate);
    if (!group) {
      group = { date: row.bookingDate, rows: [] };
      byDate.set(row.bookingDate, group);
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

export type SearchResultsBucket = "0" | "1-5" | "6+";

/** Aantal resultaten als bucket voor `search_used`; nooit een exact aantal of de zoekterm. */
export function resultsBucket(n: number): SearchResultsBucket {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n <= 5) return "1-5";
  return "6+";
}
