import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTANT_CATEGORY } from "@/lib/categories/types";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { Database } from "@/lib/supabase/types";
import { cashBuckets, cashRemaining, type CashBucket } from "@/lib/transactions/cash";

export interface CashWallet {
  /** Per opname in het potje Contant wat er nog over is, oudste eerst. */
  buckets: CashBucket[];
  /** "Contant over". */
  remaining: number;
}

const EMPTY: CashWallet = { buckets: [], remaining: 0 };

/**
 * Je portemonnee: de pinopnames in het ingebouwde potje Contant min de contante uitgaven
 * die eraan hangen. Werkt met de gebruikersclient (RLS); `userId` maakt het ook expliciet.
 */
export async function loadCashWallet(supabase: SupabaseClient<Database>, userId: string): Promise<CashWallet> {
  const { data: contant } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("system_key", CONTANT_CATEGORY.systemKey)
    .maybeSingle();
  if (!contant) return EMPTY;

  const withdrawals = await fetchAll((from, to) =>
    supabase
      .from("transactions")
      .select("id, amount, booking_date, created_at")
      .eq("user_id", userId)
      .eq("category_id", contant.id)
      .order("id")
      .range(from, to),
  );
  if (withdrawals.length === 0) return EMPTY;

  const spends = await fetchAll((from, to) =>
    supabase
      .from("transactions")
      .select("cash_withdrawal_id, amount")
      .eq("user_id", userId)
      .eq("source", "cash")
      .not("cash_withdrawal_id", "is", null)
      .order("id")
      .range(from, to),
  );

  const buckets = cashBuckets(
    withdrawals.map((w) => ({ id: w.id, amount: Number(w.amount), bookingDate: w.booking_date, createdAt: w.created_at })),
    spends.map((s) => ({ cashWithdrawalId: s.cash_withdrawal_id, amount: Number(s.amount) })),
  );
  return { buckets, remaining: cashRemaining(buckets) };
}
