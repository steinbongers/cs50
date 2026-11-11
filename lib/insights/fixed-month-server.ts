import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureNietMeetellenCategory } from "@/lib/categories/system";
import { currentPeriod, previousPeriod, type Period } from "@/lib/periods";
import type { CategorySystemKey, Database } from "@/lib/supabase/types";
import { fixedTotals, groupMonth, monthLeft, type FixedItem, type MonthGroup } from "./fixed-month";
import { loadTrackingStart, overviewStartsOn } from "./overview-start";

/**
 * Database-kant van "Je vaste maand" en "Nog over deze maand". Werkt met een gebruikersclient en
 * met de service-role-client (widget); filtert daarom altijd op user_id. Geen "server-only": de
 * widget-loader gebruikt dit ook.
 */

type Client = SupabaseClient<Database>;

/**
 * Zet open kaartjes van vóór `cutoff` op Telt niet mee. Niet verwijderen: de bank levert de
 * laatste dagen opnieuw aan en dan kwamen ze terug. Met `ids`: alleen die kaartjes.
 */
export async function ignoreOpenBefore(supabase: Client, userId: string, cutoffISO: string, ids?: string[]): Promise<number> {
  if (ids && ids.length === 0) return 0;
  const categoryId = await ensureNietMeetellenCategory(supabase, userId);
  const now = new Date().toISOString();
  let count = 0;
  const chunks = ids ? Array.from({ length: Math.ceil(ids.length / 200) }, (_, i) => ids.slice(i * 200, i * 200 + 200)) : [null];
  for (const chunk of chunks) {
    let query = supabase
      .from("transactions")
      .update({ category_id: categoryId, categorized_at: now, own_share: null, awaiting_refund: false })
      .eq("user_id", userId)
      .is("category_id", null)
      .eq("is_internal_transfer", false)
      .lt("booking_date", cutoffISO);
    if (chunk) query = query.in("id", chunk);
    const { data, error } = await query.select("id");
    if (error) throw new Error("Kaartjes konden niet worden bijgewerkt.");
    count += data?.length ?? 0;
  }
  return count;
}

export async function loadFixedItems(supabase: Client, userId: string): Promise<FixedItem[]> {
  const { data } = await supabase
    .from("fixed_items")
    .select("direction, counterparty_key, name, amount")
    .eq("user_id", userId)
    .order("amount", { ascending: false });
  return (data ?? []).map((r) => ({ direction: r.direction, key: r.counterparty_key, name: r.name, amount: Number(r.amount) }));
}

/** De vorige salarismaand als lijst per verkoper (ook wat op Telt niet mee staat: dat is juist de historie). */
export async function loadPreviousMonth(
  supabase: Client,
  userId: string,
  salaryDay: number | null,
  today: Date,
): Promise<{ period: Period; groups: MonthGroup[] }> {
  const period = previousPeriod(salaryDay, today);
  const { data } = await supabase
    .from("transactions")
    .select("booking_date, amount, counterparty")
    .eq("user_id", userId)
    .eq("is_internal_transfer", false)
    .in("source", ["bank", "csv"])
    .gte("booking_date", period.startISO)
    .lt("booking_date", period.endISO)
    .limit(3000);
  const groups = groupMonth((data ?? []).map((t) => ({ bookingDate: t.booking_date, amount: Number(t.amount), counterparty: t.counterparty })));
  return { period, groups };
}

export type MonthLeft =
  /** Eerste hele maand is nog niet begonnen: alleen wat er per maand vrij is. */
  | { status: "planned"; amount: number; startsOn: string; fixedIn: number; fixedOut: number }
  | { status: "running"; amount: number; until: string; fixedIn: number; fixedOut: number; variable: number };

/** Potjes die niet meetellen in wat je uitgaf: Telt niet mee, een al verdeelde afschrijving en een pinopname. */
const NOT_COUNTED: CategorySystemKey[] = ["negeer", "verdeeld", "contant"];

/**
 * Nog over deze maand, of null als de gebruiker zijn vaste maand nog niet heeft ingesteld.
 * Halverwege de maand begonnen: de app kent je uitgaven van vóór de start niet, dus dan tonen we
 * alleen wat er per maand vrij is, tot de eerstvolgende salarisdag.
 */
export async function loadMonthLeft(supabase: Client, userId: string, today: Date): Promise<MonthLeft | null> {
  const [items, { data: profile }] = await Promise.all([
    loadFixedItems(supabase, userId),
    supabase.from("profiles").select("salary_day").eq("id", userId).maybeSingle(),
  ]);
  if (items.length === 0) return null;
  const totals = fixedTotals(items);
  const period = currentPeriod(profile?.salary_day ?? null, today);

  const startsOn = overviewStartsOn(await loadTrackingStart(supabase, userId).catch(() => null), period);
  if (startsOn) return { status: "planned", amount: totals.freePerMonth, startsOn, fixedIn: totals.fixedIn, fixedOut: totals.fixedOut };

  const [{ data: skip }, { data: txs }] = await Promise.all([
    supabase.from("categories").select("id").eq("user_id", userId).in("system_key", NOT_COUNTED),
    supabase
      .from("transactions")
      .select("amount, counterparty, category_id")
      .eq("user_id", userId)
      .eq("is_internal_transfer", false)
      .gte("booking_date", period.startISO)
      .lt("booking_date", period.endISO)
      .limit(5000),
  ]);
  const skipIds = new Set((skip ?? []).map((c) => c.id));
  const counted = (txs ?? [])
    .filter((t) => t.category_id === null || !skipIds.has(t.category_id))
    .map((t) => ({ amount: Number(t.amount), counterparty: t.counterparty }));
  const { left, variable } = monthLeft(items, counted);
  return { status: "running", amount: left, until: period.endISO, fixedIn: totals.fixedIn, fixedOut: totals.fixedOut, variable };
}
