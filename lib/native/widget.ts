import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMonthLeft } from "@/lib/insights/fixed-month-server";
import { loadFreeToSpend } from "@/lib/insights/free-to-spend";
import { amsterdamToday } from "@/lib/periods";
import type { Database } from "@/lib/supabase/types";
import { oldestOpenCard, type WidgetCard } from "./payments";

/** Antwoord van GET /api/widget; de Swift-kant (FinanceWidget.swift) leest precies deze velden. */
export interface WidgetPayload {
  open: number;
  /** Vrij te besteden tot de volgende salarisdag ("YYYY-MM-DD"), of null als dat niet te zeggen is. */
  free: { amount: number; until: string } | null;
  /**
   * Voor de grote widget: de oudste open betaling met de meestgebruikte potjes als knoppen.
   * Null als de stapel leeg is. Oudere builds van de widget negeren dit veld.
   */
  card: WidgetCard | null;
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

export async function loadWidgetPayload(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { card?: boolean } = {},
): Promise<WidgetPayload> {
  const [open, free, card] = await Promise.all([
    countOpenTransactionsFor(supabase, userId),
    // Met een ingestelde vaste maand (en een hele maand bezig): wat er deze maand nog over is.
    // Anders de schatting op het saldo. Zonder salarisdag of saldo toont de widget alleen de kaartjes.
    loadMonthLeft(supabase, userId, amsterdamToday())
      .catch(() => null)
      .then((left) =>
        left?.status === "running"
          ? { amount: left.amount, until: left.until }
          : loadFreeToSpend(supabase, userId, new Date()).catch(() => null),
      ),
    options.card === false ? null : oldestOpenCard(supabase, userId).catch(() => null),
  ]);
  return { open, free, card };
}
