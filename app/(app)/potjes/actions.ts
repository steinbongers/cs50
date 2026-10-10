"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  isQuickSuggestionKey,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LENGTH,
  type QuickSuggestionKey,
} from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON, isCategoryIcon } from "@/lib/categories/icons";
import { isCategoryColor } from "@/lib/categories/palette";
import { ensureNietMeetellenCategory } from "@/lib/categories/system";
import { categoryKind, KIND_ERROR, type CategoryDraft } from "@/lib/categories/types";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import type { ShareStatus } from "@/lib/supabase/types";

type Result = { ok: true } | { ok: false; error: string };
const GENERIC = "Opslaan lukte niet. Probeer het nog eens.";
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

/** Markeert een openstaand deel als ontvangen of anders geregeld (of weer open). */
export async function updateShareStatus(shareId: string, status: ShareStatus): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(shareId)) return { ok: false, error: "Onbekend deel." };
  if (!["open", "received", "settled_elsewhere"].includes(status)) return { ok: false, error: "Onbekende status." };

  const supabase = await createClient();
  // Alleen echte overgangen: afvinken kan alleen vanuit 'open', terugzetten alleen naar 'open'.
  // Zo overschrijft een dubbele tik of een oud tabblad geen received_at en logt hij niets dubbel.
  const base = supabase
    .from("transaction_shares")
    .update({
      status,
      received_at: status === "open" ? null : new Date().toISOString(),
      ...(status === "open" ? { received_transaction_id: null } : {}),
    })
    .eq("id", shareId)
    .eq("user_id", user.id);
  const { data, error } = await (status === "open" ? base.neq("status", "open") : base.eq("status", "open")).select(
    "created_at",
  );

  if (error) return { ok: false, error: GENERIC };
  // Handmatig afgevinkt (Betaald / Anders geregeld): meetellen voor 'delen binnen 14 dagen'.
  const updated = data?.[0];
  if (status !== "open" && updated) {
    await logEvent("share_settled", {
      how: "manual_check",
      age_days: Math.max(0, Math.floor((Date.now() - Date.parse(updated.created_at)) / 86_400_000)),
    });
  }
  refresh();
  return { ok: true };
}

/** Meting: het potje-detail is bekeken. Eén keer per bezoek, vanaf de client (niet bij elke refresh). */
export async function logCategoryDetailViewed(): Promise<void> {
  await requireUser();
  await logEvent("category_detail_viewed", {});
}

/** Verplaatst een transactie naar een ander potje (vanaf de detailpagina). */
export async function moveTransaction(transactionId: string, categoryId: string): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !isUuid(categoryId)) return { ok: false, error: GENERIC };
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, system_key")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .eq("archived", false)
    .maybeSingle();
  if (!category || category.system_key) return { ok: false, error: "Dit potje bestaat niet (meer)." };

  // categorized_at alleen zetten als hij nog leeg is: verplaatsen is geen nieuwe
  // beslissing, anders valt de dagstreak op de oorspronkelijke dag weg.
  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, categorized_at, category_id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction) return { ok: false, error: GENERIC };
  // Uit Voorgeschoten, Contant of Verdeeld verplaatsen zou bedragen dubbel laten tellen. Een deel van
  // een verdeelde afschrijving staat in een gewoon potje en verplaats je wel.
  if (transaction.category_id) {
    const { data: from } = await supabase
      .from("categories")
      .select("system_key")
      .eq("id", transaction.category_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (from?.system_key) return { ok: false, error: "Dit kaartje kun je niet verplaatsen." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId,
      ...(transaction.categorized_at === null ? { categorized_at: new Date().toISOString() } : {}),
    })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC };
  // Terugbetalingen die bij deze uitgave horen gaan mee, zodat ze van hetzelfde potje af blijven gaan.
  await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .eq("refund_for_id", transactionId)
    .eq("user_id", user.id);

  // Eigen type: verplaatsen is geen swipe en telt niet mee in de swipe- en retentiecijfers.
  await logEvent("transaction_moved", { transaction_id: transactionId, category_id: categoryId });
  refresh();
  return { ok: true };
}

const AMOUNT_ERROR = "Vul een bedrag boven € 0 in.";
const MAX_GOAL_AMOUNT = 1_000_000;

/** Geldig bedrag voor budget of doel: groter dan 0 en hoogstens 1.000.000, op centen afgerond. */
function parseGoalAmount(amount: number | null): { ok: true; value: number | null } | { ok: false } {
  if (amount === null) return { ok: true, value: null };
  if (typeof amount !== "number" || !Number.isFinite(amount)) return { ok: false };
  const value = Math.round(amount * 100) / 100;
  if (value <= 0 || value > MAX_GOAL_AMOUNT) return { ok: false };
  return { ok: true, value };
}

/**
 * Zet budget of spaardoel van een potje. Een potje heeft er hoogstens één van:
 * het andere veld gaat altijd naar null. Niet voor Inkomen en systeempotjes.
 */
async function writeGoal(categoryId: string, field: "monthly_budget" | "goal_amount", amount: number | null): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false, error: GENERIC };
  const parsed = parseGoalAmount(amount);
  if (!parsed.ok) return { ok: false, error: AMOUNT_ERROR };

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id, is_income, system_key")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!category || category.system_key) return { ok: false, error: "Dit potje bestaat niet (meer)." };
  if (category.is_income && parsed.value !== null) return { ok: false, error: "Bij Inkomen houd je geen budget of doel bij." };

  const { error } = await supabase
    .from("categories")
    .update(
      field === "monthly_budget"
        ? { monthly_budget: parsed.value, goal_amount: null }
        : { goal_amount: parsed.value, monthly_budget: null },
    )
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .is("system_key", null);
  if (error) return { ok: false, error: GENERIC };

  await logEvent(field === "monthly_budget" ? "budget_set" : "goal_set", { cleared: parsed.value === null });
  refresh();
  return { ok: true };
}

/** Maandbudget instellen of weghalen (null). Wist altijd het spaardoel. */
export async function setBudget(categoryId: string, budget: number | null): Promise<Result> {
  return writeGoal(categoryId, "monthly_budget", budget);
}

/** Spaardoel instellen of weghalen (null). Wist altijd het maandbudget. */
export async function setGoal(categoryId: string, amount: number | null): Promise<Result> {
  return writeGoal(categoryId, "goal_amount", amount);
}

/** Naam, icoon, kleur en soort (inkomend geld of spaarpotje) van een potje aanpassen. */
export async function updateCategory(categoryId: string, draft: Omit<CategoryDraft, "id" | "enabled">): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false, error: GENERIC };
  const name = typeof draft.name === "string" ? draft.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH) : "";
  if (!name) return { ok: false, error: "Geef het potje een naam." };
  const kind = categoryKind(draft);
  if (!kind) return { ok: false, error: KIND_ERROR };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      icon: isCategoryIcon(draft.icon) ? draft.icon : DEFAULT_CATEGORY_ICON,
      color: isCategoryColor(draft.color) ? draft.color : "grijs",
      ...kind,
    })
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .is("system_key", null);
  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true };
}

/** Potje archiveren: verdwijnt uit de tegels en lijsten, transacties blijven eraan hangen. */
export async function archiveCategory(categoryId: string): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ archived: true })
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .is("system_key", null);
  if (error) return { ok: false, error: GENERIC };
  await logEvent("potje_archived", {});
  redirect("/overzicht");
}

/** Nieuw potje vanuit Potjes beheren (de potje-editor). Logt alleen bron en suggestie, nooit de naam. */
export async function createPotje(
  draft: Omit<CategoryDraft, "id" | "enabled">,
  suggestion: QuickSuggestionKey | null = null,
): Promise<{ ok: true; category: { id: string; name: string; icon: string; color: string } } | { ok: false; error: string }> {
  const user = await requireUser();
  const name = typeof draft?.name === "string" ? draft.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH) : "";
  if (!name) return { ok: false, error: "Geef het potje een naam." };
  const kind = categoryKind(draft);
  if (!kind) return { ok: false, error: KIND_ERROR };

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("archived", false)
    .is("system_key", null);
  if ((count ?? 0) >= MAX_CATEGORIES) return { ok: false, error: `Je hebt al ${MAX_CATEGORIES} potjes.` };

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("user_id", user.id)
    .is("system_key", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name,
      icon: isCategoryIcon(draft.icon) ? draft.icon : DEFAULT_CATEGORY_ICON,
      color: isCategoryColor(draft.color) ? draft.color : "grijs",
      ...kind,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("id, name, icon, color")
    .single();
  if (error || !data) return { ok: false, error: GENERIC };

  await logEvent("potje_created", {
    source: "editor",
    suggestion: isQuickSuggestionKey(suggestion) ? suggestion : null,
    savings: kind.is_savings === true,
  });
  refresh();
  return { ok: true, category: data };
}

/** Nieuwe vaste volgorde van de potjes (de tegels op het hoofdscherm volgen deze). */
export async function reorderCategories(orderedIds: string[]): Promise<Result> {
  const user = await requireUser();
  if (!Array.isArray(orderedIds) || !orderedIds.every(isUuid) || orderedIds.length > 100) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: index })
      .eq("id", orderedIds[index])
      .eq("user_id", user.id)
      .is("system_key", null);
    if (error) return { ok: false, error: GENERIC };
  }
  refresh();
  return { ok: true };
}

/** Gearchiveerd potje terugzetten. */
export async function restoreCategory(categoryId: string): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false, error: GENERIC };
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ archived: false })
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .is("system_key", null);
  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true };
}

/**
 * Kaartje wel of niet meetellen. Niet meetellen: het gaat in het ingebouwde potje Telt niet
 * mee en telt nergens mee (maand, Overzicht, potjes, grafieken). Toch meetellen: het gaat terug
 * op de stapel, zodat je zelf het potje kiest. Niet voor kaartjes die aan iets anders vastzitten
 * (verdeeld, contant, geld terug bijhouden, een terugbetaling of oude open delen).
 */
export async function setCounted(transactionId: string, counted: boolean): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC };
  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("id, category_id, source, awaiting_refund, refund_for_id, split_parent_id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!tx) return { ok: false, error: GENERIC };

  const { data: current } = tx.category_id
    ? await supabase.from("categories").select("system_key").eq("id", tx.category_id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  if (!counted) {
    if (current?.system_key === "negeer") return { ok: true };
    const linked = tx.source !== "bank" || tx.awaiting_refund || tx.refund_for_id !== null || tx.split_parent_id !== null || Boolean(current?.system_key);
    const { count: shares } = await supabase
      .from("transaction_shares")
      .select("id", { count: "exact", head: true })
      .eq("transaction_id", transactionId)
      .eq("user_id", user.id);
    if (linked || (shares ?? 0) > 0) return { ok: false, error: "Dit kaartje hangt aan iets anders vast. Dat kan hier niet." };

    let negeerId: string;
    try {
      negeerId = await ensureNietMeetellenCategory(supabase, user.id);
    } catch {
      return { ok: false, error: GENERIC };
    }
    const { error } = await supabase
      .from("transactions")
      .update({ category_id: negeerId, categorized_at: new Date().toISOString(), own_share: null })
      .eq("id", transactionId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: GENERIC };
    await logEvent("counted_changed", { counted: false, from: tx.category_id ? "potje" : "stapel" });
    refresh();
    return { ok: true };
  }

  if (current?.system_key !== "negeer") return { ok: true };
  const { error } = await supabase
    .from("transactions")
    .update({ category_id: null, categorized_at: null, own_share: null })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC };
  await logEvent("counted_changed", { counted: true, from: "potje" });
  refresh();
  return { ok: true };
}
