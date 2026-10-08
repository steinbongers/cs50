"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { MAX_CATEGORY_NAME_LENGTH } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON, isCategoryIcon } from "@/lib/categories/icons";
import { isCategoryColor } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
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
  const { error } = await supabase
    .from("transaction_shares")
    .update({
      status,
      received_at: status === "open" ? null : new Date().toISOString(),
      ...(status === "open" ? { received_transaction_id: null } : {}),
    })
    .eq("id", shareId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true };
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

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, categorized_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC };

  await logEvent("swipe", { transaction_id: transactionId, category_id: categoryId, duration_ms: 0, moved: true });
  refresh();
  return { ok: true };
}

/** Maandbudget instellen of weghalen (null). */
export async function setBudget(categoryId: string, budget: number | null): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false, error: GENERIC };
  if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000)) {
    return { ok: false, error: "Vul een bedrag in, of laat het leeg." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ monthly_budget: budget === null ? null : Math.round(budget * 100) / 100 })
    .eq("id", categoryId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true };
}

/** Naam, icoon, kleur en inkomend-geld van een potje aanpassen. */
export async function updateCategory(categoryId: string, draft: Omit<CategoryDraft, "id" | "enabled">): Promise<Result> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false, error: GENERIC };
  const name = typeof draft.name === "string" ? draft.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH) : "";
  if (!name) return { ok: false, error: "Geef het potje een naam." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({
      name,
      icon: isCategoryIcon(draft.icon) ? draft.icon : DEFAULT_CATEGORY_ICON,
      color: isCategoryColor(draft.color) ? draft.color : "grijs",
      is_income: Boolean(draft.isIncome),
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
  redirect("/potjes");
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
