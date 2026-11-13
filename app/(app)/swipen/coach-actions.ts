"use server";

import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

/** Bewaart hoe ver de gebruiker is met de begeleide eerste kaarten. */
export async function setCoachStep(step: number): Promise<void> {
  const user = await requireUser();
  const value = Math.min(Math.max(Math.round(step), 0), 9);
  const supabase = await createClient();
  await supabase.from("profiles").update({ coach_step: value }).eq("id", user.id);
}

/** Begeleide eerste kaarten afgerond: stand opslaan en één keer meten. */
export async function completeCoach(stepsSeen: number): Promise<void> {
  const user = await requireUser();
  const steps = Math.min(Math.max(Math.round(Number(stepsSeen) || 0), 0), 9);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("coach_step").eq("id", user.id).maybeSingle();
  await supabase.from("profiles").update({ coach_step: Math.max(steps, profile?.coach_step ?? 0) }).eq("id", user.id);
  // Alleen meten als de coach nog niet eerder als afgerond stond.
  if ((profile?.coach_step ?? 0) < steps) await logEvent("coach_completed", { steps_seen: steps });
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
