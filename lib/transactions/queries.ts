import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Period } from "@/lib/periods";
import type { CategorySystemKey } from "@/lib/supabase/types";
import { receivedPerExpense, type AwaitingRefund } from "@/lib/transactions/refunds";

export type { AwaitingRefund } from "@/lib/transactions/refunds";

/** Smalle transactie voor het hoofdscherm; alleen wat de kaart nodig heeft. */
export interface OpenTransaction {
  id: string;
  bookingDate: string;
  bookingTime: string | null;
  amount: number;
  counterparty: string;
  description: string | null;
  rawCounterparty: string | null;
  rawDescription: string | null;
  balanceAfter: number | null;
  skippedCount: number;
  /** Eigen notitie (maximaal 140 tekens), of null. */
  note: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  /** Spaarpotje: op de tegel staat dan wat er netto in ging (erin min eruit). */
  isSavings: boolean;
  systemKey: CategorySystemKey | null;
  /** Netto bedrag in deze periode (eigen deel van uitgaven, min terugbetalingen). */
  spentThisPeriod: number;
  monthlyBudget: number | null;
  goalAmount: number | null;
}

export interface OpenShare {
  id: string;
  transactionId: string;
  personName: string | null;
  amount: number;
  counterparty: string;
  bookingDate: string;
  /** Wanneer het deel is aangemaakt (ISO-tijdstempel), voor de leeftijd van een open deel. */
  createdAt: string;
}

export const OPEN_BATCH_SIZE = 40;

/**
 * Transacties zonder potje, oudste eerst. Eerder overgeslagen kaarten komen
 * achteraan, zodat "Later" ook echt later betekent. Eigen overboekingen
 * tussen gekoppelde rekeningen komen niet op de stapel.
 */
export async function getOpenTransactions(limit = OPEN_BATCH_SIZE): Promise<OpenTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, booking_date, booking_time, amount, counterparty, description, raw_counterparty, raw_description, balance_after, skipped_count, note",
    )
    .is("category_id", null)
    .eq("is_internal_transfer", false)
    .order("skipped_count", { ascending: true })
    .order("booking_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error("Transacties konden niet worden geladen.");

  return (data ?? []).map((t) => ({
    id: t.id,
    bookingDate: t.booking_date,
    bookingTime: t.booking_time ? t.booking_time.slice(0, 5) : null,
    amount: Number(t.amount),
    counterparty: t.counterparty?.trim() || "Onbekende tegenpartij",
    description: t.description?.trim() || null,
    rawCounterparty: t.raw_counterparty,
    rawDescription: t.raw_description,
    balanceAfter: t.balance_after === null ? null : Number(t.balance_after),
    skippedCount: t.skipped_count,
    note: t.note,
  }));
}

export async function countOpenTransactions(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .is("category_id", null)
    .eq("is_internal_transfer", false);
  return count ?? 0;
}

/**
 * Actieve potjes met het netto bedrag van deze periode.
 * Uitgaven tellen voor het eigen deel; terugbetalingen die in een potje zijn
 * gezet verlagen het bedrag. Inkomenpotjes tellen het inkomende geld. Bij een spaarpotje is
 * het wat er netto in ging: erin telt op, eruit gaat eraf.
 */
export async function getActiveCategories(period: Period): Promise<CategoryOption[]> {
  const supabase = await createClient();

  const [{ data: categories, error }, { data: rows }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, icon, color, is_income, is_savings, system_key, monthly_budget, goal_amount")
      .eq("archived", false)
      .order("sort_order", { ascending: true }),
    supabase
      .from("transactions")
      .select("category_id, amount, own_share")
      .gte("booking_date", period.startISO)
      .lt("booking_date", period.endISO),
  ]);

  if (error) throw new Error("Potjes konden niet worden geladen.");

  const totals = new Map<string, number>();
  const incomeIds = new Set((categories ?? []).filter((c) => c.is_income).map((c) => c.id));
  for (const row of rows ?? []) {
    if (!row.category_id) continue;
    const amount = Number(row.amount);
    const current = totals.get(row.category_id) ?? 0;
    if (incomeIds.has(row.category_id)) {
      totals.set(row.category_id, current + Math.max(amount, 0));
    } else if (amount < 0) {
      const own = row.own_share === null ? -amount : Number(row.own_share);
      totals.set(row.category_id, current + own);
    } else {
      totals.set(row.category_id, current - amount);
    }
  }

  return (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isIncome: c.is_income,
    isSavings: c.is_savings,
    systemKey: c.system_key,
    spentThisPeriod: Math.round((totals.get(c.id) ?? 0) * 100) / 100,
    monthlyBudget: c.monthly_budget === null ? null : Number(c.monthly_budget),
    goalAmount: c.goal_amount === null ? null : Number(c.goal_amount),
  }));
}

/** Openstaande delen die anderen nog aan jou terugbetalen. */
export async function getOpenShares(): Promise<OpenShare[]> {
  const supabase = await createClient();
  const { data: shares, error } = await supabase
    .from("transaction_shares")
    .select("id, transaction_id, person_name, amount, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (error || !shares || shares.length === 0) return [];

  const transactionIds = [...new Set(shares.map((s) => s.transaction_id))];
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, counterparty, booking_date")
    .in("id", transactionIds);

  const byId = new Map((transactions ?? []).map((t) => [t.id, t]));

  return shares.map((s) => {
    const t = byId.get(s.transaction_id);
    return {
      id: s.id,
      transactionId: s.transaction_id,
      personName: s.person_name,
      amount: Number(s.amount),
      counterparty: t?.counterparty?.trim() || "Onbekende tegenpartij",
      bookingDate: t?.booking_date ?? "",
      createdAt: s.created_at,
    };
  });
}

/**
 * Uitgaven die nog op geld terug wachten ("Ik krijg een deel terug", bijhouden), nieuwste
 * eerst, met per uitgave wat er al binnen is. Een vast bedrag voor "nog te krijgen" bestaat
 * hier niet: er is niets afgesproken, je houdt alleen bij wat er terugkomt.
 */
export async function getAwaitingRefunds(): Promise<AwaitingRefund[]> {
  const supabase = await createClient();
  const { data: expenses, error } = await supabase
    .from("transactions")
    .select("id, counterparty, booking_date, amount, category_id")
    .eq("awaiting_refund", true)
    .not("category_id", "is", null)
    .lt("amount", 0)
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !expenses || expenses.length === 0) return [];

  const ids = expenses.map((e) => e.id);
  const categoryIds = [...new Set(expenses.map((e) => e.category_id as string))];
  const [{ data: refunds }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("refund_for_id, amount").in("refund_for_id", ids),
    supabase.from("categories").select("id, name").in("id", categoryIds),
  ]);

  const received = receivedPerExpense(
    (refunds ?? []).map((r) => ({ refundForId: r.refund_for_id, amount: Number(r.amount) })),
  );
  const names = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return expenses.map((e) => ({
    id: e.id,
    counterparty: e.counterparty?.trim() || "Onbekende tegenpartij",
    bookingDate: e.booking_date,
    amount: Math.abs(Number(e.amount)),
    categoryId: e.category_id as string,
    categoryName: names.get(e.category_id as string) ?? "",
    received: received.get(e.id) ?? 0,
  }));
}
