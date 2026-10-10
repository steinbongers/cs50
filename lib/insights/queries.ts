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

export interface InsightOptions {
  /** Laad ook alles vanaf deze datum ("YYYY-MM-DD"), als die verder terug ligt dan de standaardhistorie. */
  since?: string;
}

/**
 * Laadt transacties (recente plus alle open) en actieve potjes voor de rekenfuncties.
 * Van spaarpotjes komt alles mee, ook van vóór de standaardhistorie: hun stand telt over
 * alle kaartjes (`savedPerCategory` zonder datums).
 */
export async function loadInsightData(
  supabase: SupabaseClient<Database>,
  today = new Date(),
  options: InsightOptions = {},
): Promise<InsightData> {
  const standard = toISODate(new Date(today.getTime() - HISTORY_DAYS * 864e5));
  const cutoff = options.since && options.since < standard ? options.since : standard;
  const columns =
    "id, booking_date, amount, own_share, category_id, created_at, categorized_at, is_internal_transfer, counterparty, split_parent_id";

  const [recent, openOld, { data: categories }] = await Promise.all([
    fetchAll((from, to) => supabase.from("transactions").select(columns).gte("booking_date", cutoff).order("id").range(from, to)),
    fetchAll((from, to) =>
      supabase.from("transactions").select(columns).is("category_id", null).lt("booking_date", cutoff).order("id").range(from, to),
    ),
    supabase
      .from("categories")
      .select("id, name, icon, color, is_income, is_savings, system_key, monthly_budget, goal_amount")
      .eq("archived", false)
      .order("sort_order", { ascending: true }),
  ]);

  // Oudere kaartjes in spaarpotjes, voor de stand. Alleen als er spaarpotjes zijn.
  const savingsIds = (categories ?? []).filter((c) => c.is_savings).map((c) => c.id);
  const savingsOld =
    savingsIds.length > 0
      ? await fetchAll((from, to) =>
          supabase.from("transactions").select(columns).in("category_id", savingsIds).lt("booking_date", cutoff).order("id").range(from, to),
        )
      : [];

  const seen = new Set<string>();
  const txs: TxLite[] = [];
  for (const row of [...recent, ...openOld, ...savingsOld]) {
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
      counterparty: row.counterparty,
      isSplitPart: row.split_parent_id !== null,
    });
  }

  const cats: CatLite[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    isIncome: c.is_income,
    isSavings: c.is_savings,
    systemKey: c.system_key,
    monthlyBudget: c.monthly_budget === null ? null : Number(c.monthly_budget),
    goalAmount: c.goal_amount === null ? null : Number(c.goal_amount),
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
