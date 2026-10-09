import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Antwoord van GET /api/widget; de Swift-kant (FinanceWidget.swift) leest precies deze velden. */
export interface WidgetPayload {
  open: number;
  /** Vrij te besteden tot de volgende salarisdag ("YYYY-MM-DD"), of null als dat niet te zeggen is. */
  free: { amount: number; until: string } | null;
}

/**
 * Open kaartjes van één gebruiker, zoals `countOpenTransactions`, maar voor de
 * service-role-client van de widget. Die omzeilt RLS: filter daarom altijd op user_id.
 */
export async function countOpenTransactionsFor(supabase: SupabaseClient<Database>, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("category_id", null)
    .eq("is_internal_transfer", false);
  if (error) throw new Error("Open kaartjes konden niet worden geteld.");
  return count ?? 0;
}
