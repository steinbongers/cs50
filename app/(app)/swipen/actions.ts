"use server";

import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "Opslaan lukte niet. Probeer het nog eens.";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

/** Zet een transactie in een potje. Dit is de kernhandeling van de app. */
export async function assignCategory(
  transactionId: string,
  categoryId: string,
  durationMs: number,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !isUuid(categoryId)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();

  // Het potje moet van deze gebruiker zijn en actief.
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .eq("archived", false)
    .maybeSingle();
  if (!category) return { ok: false, error: "Dit potje bestaat niet (meer)." };

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, categorized_at: new Date().toISOString() })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .select("id, skipped_count")
    .maybeSingle();

  if (error || !updated) return { ok: false, error: GENERIC_ERROR };

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: categoryId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: updated.skipped_count,
  });

  return { ok: true };
}

/** Maakt de laatste keuze ongedaan: de transactie gaat terug naar de stapel. */
export async function undoAssign(transactionId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: null, categorized_at: null })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) return { ok: false, error: "Ongedaan maken lukte niet." };

  await logEvent("undo", { transaction_id: transactionId });
  return { ok: true };
}

/** Legt een kaart achteraan de stapel. */
export async function skipTransaction(transactionId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!isUuid(transactionId)) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("transactions")
    .select("skipped_count")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!current) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("transactions")
    .update({ skipped_count: current.skipped_count + 1 })
    .eq("id", transactionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logEvent("skip", { transaction_id: transactionId, skipped_count: current.skipped_count + 1 });
  return { ok: true };
}

/** Registreert het einde van een ronde (alle geladen kaarten verwerkt). */
export async function completeSession(summary: {
  assigned: number;
  skipped: number;
  undone: number;
  durationMs: number;
}): Promise<void> {
  await requireUser();
  await logEvent("swipe_session_complete", {
    assigned: Math.max(0, Math.round(summary.assigned)),
    skipped: Math.max(0, Math.round(summary.skipped)),
    undone: Math.max(0, Math.round(summary.undone)),
    duration_ms: Math.max(0, Math.round(summary.durationMs)),
  });
}
