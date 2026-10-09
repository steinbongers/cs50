/**
 * "Vrij tot je salaris": je saldo min de vaste lasten die vóór je volgende
 * salarisdag nog afgaan. Een schatting, geen belofte; de uitleg staat erbij.
 *
 * Geen "server-only" in dit bestand: de rekenfunctie wordt getest met node:test
 * en de loader draait ook met een service-role client (iOS-widget). Daarom filtert
 * elke query zelf op user_id.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentPeriod } from "@/lib/periods";
import type { Database } from "@/lib/supabase/types";
import { round2, previousPeriods } from "./compute";
import { detectRecurring, nextOccurrenceISO, type RecurringCharge, type RecurringTx } from "./recurring";

export interface UpcomingCharge {
  key: string;
  name: string;
  amount: number;
  /** Verwachte datum, "YYYY-MM-DD". */
  expectedDate: string;
}

export interface FreeToSpend {
  amount: number;
  /** Volgende salarisdag, "YYYY-MM-DD". */
  until: string;
  /** Saldo van alle actieve rekeningen samen. */
  balance: number;
  /** Vaste lasten die nog komen vóór de salarisdag, op datum. */
  upcoming: UpcomingCharge[];
}

export interface FreeToSpendInput {
  /** Laatst bekende saldo per actieve rekening (null = niet bekend). */
  balances: readonly (number | null)[];
  recurring: readonly RecurringCharge[];
  salaryDay: number | null;
  today: Date;
}

/**
 * Null zonder salarisdag of zonder bekend saldo. Een totaal klopt alleen als we
 * van elke actieve rekening het saldo kennen. Een vaste last telt als hij deze
 * periode nog niet is afgeschreven en zijn gewone dag vóór de salarisdag valt.
 */
export function computeFreeToSpend({ balances, recurring, salaryDay, today }: FreeToSpendInput): FreeToSpend | null {
  if (!salaryDay) return null;
  if (balances.length === 0 || balances.some((b) => b === null || !Number.isFinite(b))) return null;

  const period = currentPeriod(salaryDay, today);
  const upcoming = recurring
    .filter((r) => !r.paidThisPeriod)
    .map((r) => ({ key: r.key, name: r.name, amount: r.averageAmount, expectedDate: nextOccurrenceISO(r.usualDay, today) }))
    .filter((u) => u.expectedDate < period.endISO)
    .sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || b.amount - a.amount);

  const balance = round2(balances.reduce<number>((sum, b) => sum + (b ?? 0), 0));
  const amount = round2(balance - upcoming.reduce((sum, u) => sum + u.amount, 0));
  return { amount, until: period.endISO, balance, upcoming };
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

/** Uitgaande betalingen van de laatste drie volle periodes plus de huidige. */
async function loadRecurringTxs(supabase: SupabaseClient<Database>, userId: string, fromISO: string): Promise<RecurringTx[]> {
  const rows: RecurringTx[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("transactions")
      .select("id, booking_date, amount, counterparty, category_id, is_internal_transfer")
      .eq("user_id", userId)
      .lt("amount", 0)
      .gte("booking_date", fromISO)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("Gegevens konden niet worden geladen.");
    for (const t of data ?? []) {
      rows.push({
        bookingDate: t.booking_date,
        amount: Number(t.amount),
        counterparty: t.counterparty,
        categoryId: t.category_id,
        isInternal: t.is_internal_transfer,
      });
    }
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return rows;
}

/** Vaste lasten van deze gebruiker. Werkt met een gewone en een service-role client. */
export async function loadRecurringCharges(
  supabase: SupabaseClient<Database>,
  userId: string,
  salaryDay: number | null,
  today: Date,
): Promise<RecurringCharge[]> {
  const oldest = previousPeriods(salaryDay, today, 3).at(-1) ?? currentPeriod(salaryDay, today);
  const [txs, { data: systemCats }] = await Promise.all([
    loadRecurringTxs(supabase, userId, oldest.startISO),
    supabase.from("categories").select("id").eq("user_id", userId).not("system_key", "is", null),
  ]);
  return detectRecurring(txs, new Set((systemCats ?? []).map((c) => c.id)), salaryDay, today);
}

/** Alles voor het overzicht: de vaste lasten en (als het kan) het vrij te besteden bedrag. */
export async function loadFreeToSpendDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: Date,
): Promise<{ recurring: RecurringCharge[]; free: FreeToSpend | null }> {
  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from("profiles").select("salary_day").eq("id", userId).maybeSingle(),
    supabase.from("accounts").select("last_balance, external_uid").eq("user_id", userId).eq("active", true),
  ]);
  const salaryDay = profile?.salary_day ?? null;
  const recurring = await loadRecurringCharges(supabase, userId, salaryDay, today);
  const balances = (accounts ?? [])
    .filter((a) => a.external_uid !== null)
    .map((a) => (a.last_balance === null ? null : Number(a.last_balance)));
  return { recurring, free: computeFreeToSpend({ balances, recurring, salaryDay, today }) };
}

/**
 * Vrij tot je salaris, kort: voor de iOS-widget en het overzicht.
 * Null zonder salarisdag of zonder bekend saldo.
 */
export async function loadFreeToSpend(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: Date,
): Promise<{ amount: number; until: string } | null> {
  const { free } = await loadFreeToSpendDetails(supabase, userId, today);
  return free ? { amount: free.amount, until: free.until } : null;
}
