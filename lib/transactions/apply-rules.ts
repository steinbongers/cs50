import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetch-all";
import type { Database } from "@/lib/supabase/types";
import { ruleCategory } from "./rules";

const IN_CHUNK = 200;

/**
 * Deelt open kaartjes in volgens de vaste ontvangers van de gebruiker.
 * `ids`: alleen deze transacties (na een bank-sync); anders alle open kaartjes.
 * `onlyMatch`: alleen deze ene regel (net aangemaakt).
 * Werkt met een gebruikersclient en met de service-role client (cron). Logt nooit transactiedata.
 * Geeft de ingedeelde id's terug.
 */
export async function applyRules(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { ids?: string[]; onlyMatch?: string } = {},
): Promise<string[]> {
  if (options.ids && options.ids.length === 0) return [];

  let rulesQuery = supabase.from("category_rules").select("counterparty_match, category_id").eq("user_id", userId);
  if (options.onlyMatch) rulesQuery = rulesQuery.eq("counterparty_match", options.onlyMatch);
  const [{ data: rules }, { data: active }] = await Promise.all([
    rulesQuery,
    supabase.from("categories").select("id").eq("user_id", userId).eq("archived", false).is("system_key", null),
  ]);
  const activeIds = new Set((active ?? []).map((c) => c.id));
  const map = new Map((rules ?? []).filter((r) => activeIds.has(r.category_id)).map((r) => [r.counterparty_match, r.category_id]));
  if (map.size === 0) return [];

  type OpenRow = { id: string; counterparty: string | null; amount: number };
  const open: OpenRow[] = [];
  const base = () =>
    supabase
      .from("transactions")
      .select("id, counterparty, amount")
      .eq("user_id", userId)
      .is("category_id", null)
      .eq("is_internal_transfer", false);
  if (options.ids) {
    for (let i = 0; i < options.ids.length; i += IN_CHUNK) {
      const { data } = await base().in("id", options.ids.slice(i, i + IN_CHUNK));
      open.push(...((data ?? []) as OpenRow[]));
    }
  } else {
    open.push(...((await fetchAll((from, to) => base().order("id").range(from, to))) as OpenRow[]));
  }

  const byCategory = new Map<string, string[]>();
  for (const tx of open) {
    const categoryId = ruleCategory(map, { counterparty: tx.counterparty, amount: Number(tx.amount) });
    if (categoryId) byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), tx.id]);
  }

  const applied: string[] = [];
  const now = new Date().toISOString();
  for (const [categoryId, ids] of byCategory) {
    for (let i = 0; i < ids.length; i += IN_CHUNK) {
      const { data } = await supabase
        .from("transactions")
        .update({ category_id: categoryId, categorized_at: now, own_share: null })
        .in("id", ids.slice(i, i + IN_CHUNK))
        .eq("user_id", userId)
        .is("category_id", null)
        .select("id");
      applied.push(...(data ?? []).map((t) => t.id));
    }
  }
  return applied;
}
