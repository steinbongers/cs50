import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/supabase/types";

/** Smalle transactie voor het hoofdscherm; alleen wat de kaart nodig heeft. */
export interface OpenTransaction {
  id: string;
  bookingDate: string;
  amount: number;
  counterparty: string;
  description: string | null;
  skippedCount: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
}

export const OPEN_BATCH_SIZE = 40;

/**
 * Transacties zonder potje, oudste eerst. Eerder overgeslagen kaarten komen
 * achteraan, zodat "Later" ook echt later betekent.
 */
export async function getOpenTransactions(limit = OPEN_BATCH_SIZE): Promise<OpenTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, booking_date, amount, counterparty, description, skipped_count")
    .is("category_id", null)
    .order("skipped_count", { ascending: true })
    .order("booking_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error("Transacties konden niet worden geladen.");

  return (data ?? []).map((t) => ({
    id: t.id,
    bookingDate: t.booking_date,
    amount: Number(t.amount),
    counterparty: t.counterparty?.trim() || "Onbekende tegenpartij",
    description: t.description?.trim() || null,
    skippedCount: t.skipped_count,
  }));
}

export async function countOpenTransactions(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .is("category_id", null);
  return count ?? 0;
}

export async function getActiveCategories(): Promise<CategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, color, is_income")
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw new Error("Potjes konden niet worden geladen.");

  return (data ?? []).map((c: Pick<CategoryRow, "id" | "name" | "icon" | "color" | "is_income">) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isIncome: c.is_income,
  }));
}
