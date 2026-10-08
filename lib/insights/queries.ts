import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/format";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { Database } from "@/lib/supabase/types";
import type { CatLite, TxLite } from "./compute";

/** Hoeveel dagen historie we laden voor gemiddelden (ruim vijf periodes). */
const HISTORY_DAYS = 160;

export interface InsightData {
  txs: TxLite[];
  cats: CatLite[];
}

/** Laadt transacties (recente plus alle open) en actieve potjes voor de rekenfuncties. */
export async function loadInsightData(supabase: SupabaseClient<Database>, today = new Date()): Promise<InsightData> {
  const cutoff = toISODate(new Date(today.getTime() - HISTORY_DAYS * 864e5));
  const columns = "id, booking_date, amount, own_share, category_id, created_at, categorized_at, is_internal_transfer";

  const [recent, openOld, { data: categories }] = await Promise.all([
    fetchAll((from, to) => supabase.from("transactions").select(columns).gte("booking_date", cutoff).order("id").range(from, to)),
    fetchAll((from, to) =>
      supabase.from("transactions").select(columns).is("category_id", null).lt("booking_date", cutoff).order("id").range(from, to),
    ),
    supabase
      .from("categories")
      .select("id, name, icon, color, is_income, system_key, monthly_budget")
      .eq("archived", false)
      .order("sort_order", { ascending: true }),
  ]);

  const seen = new Set<string>();
  const txs: TxLite[] = [];
  for (const row of [...recent, ...openOld]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    txs.push({
      id: row.id,
      bookingDate: row.booking_date,
      amount: Number(row.amount),
      ownShare: row.own_share === null ? null : Number(row.own_share),
      categoryId: row.category_id,
      createdAt: row.created_at,
      categorizedAt: row.categorized_at,
      isInternal: row.is_internal_transfer,
    });
  }

  const cats: CatLite[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isIncome: c.is_income,
    systemKey: c.system_key,
    monthlyBudget: c.monthly_budget === null ? null : Number(c.monthly_budget),
  }));

  return { txs, cats };
}

export interface AccountBalance {
  id: string;
  name: string;
  ibanMasked: string | null;
  balance: number | null;
  lastSyncedAt: string | null;
}

export async function loadAccountBalances(supabase: SupabaseClient<Database>): Promise<AccountBalance[]> {
  const { data } = await supabase
    .from("accounts")
    .select("id, name, iban_masked, last_balance, last_synced_at, external_uid")
    .order("created_at", { ascending: true });
  return (data ?? [])
    .filter((a) => a.external_uid !== null)
    .map((a) => ({
      id: a.id,
      name: a.name ?? "Rekening",
      ibanMasked: a.iban_masked,
      balance: a.last_balance === null ? null : Number(a.last_balance),
      lastSyncedAt: a.last_synced_at,
    }));
}
