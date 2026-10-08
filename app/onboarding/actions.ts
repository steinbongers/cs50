"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { MAX_CATEGORIES, MAX_CATEGORY_NAME_LENGTH } from "@/lib/categories/defaults";
import { DEFAULT_CATEGORY_ICON, isCategoryIcon } from "@/lib/categories/icons";
import { isCategoryColor } from "@/lib/categories/palette";
import { createClient } from "@/lib/supabase/server";
import type { SwipeDirection } from "@/lib/supabase/types";

export interface CategoryDraft {
  /** Aanwezig als het potje al in de database staat. */
  id?: string;
  name: string;
  icon: string;
  color: string;
  isIncome: boolean;
  enabled: boolean;
}

export type SaveCategoriesResult = { error: string } | undefined;

const DEFAULT_DIRECTION_ORDER: readonly SwipeDirection[] = ["right", "left", "up", "down"];

function isValidDraft(value: unknown): value is CategoryDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.id === undefined || typeof v.id === "string") &&
    typeof v.name === "string" &&
    typeof v.icon === "string" &&
    typeof v.color === "string" &&
    typeof v.isIncome === "boolean" &&
    typeof v.enabled === "boolean"
  );
}

/**
 * Slaat de potjeskeuze uit de onboarding op.
 * - nieuwe, aangezette potjes worden toegevoegd
 * - bestaande potjes worden bijgewerkt; uitgezette worden gearchiveerd
 * - uitgezette potjes uit de startset worden niet opgeslagen
 * Daarna gaat de gebruiker door naar de volgende stap.
 */
export async function saveOnboardingCategories(
  drafts: CategoryDraft[],
): Promise<SaveCategoriesResult> {
  const user = await requireUser();

  if (!Array.isArray(drafts) || !drafts.every(isValidDraft)) {
    return { error: "De potjes konden niet worden gelezen. Probeer het opnieuw." };
  }

  const cleaned = drafts.map((d) => ({
    ...d,
    name: d.name.trim().slice(0, MAX_CATEGORY_NAME_LENGTH),
    icon: isCategoryIcon(d.icon) ? d.icon : DEFAULT_CATEGORY_ICON,
    color: isCategoryColor(d.color) ? d.color : "grijs",
  }));

  const enabled = cleaned.filter((d) => d.enabled);
  if (enabled.length === 0) return { error: "Kies minimaal één potje." };
  if (enabled.length > MAX_CATEGORIES) return { error: `Kies maximaal ${MAX_CATEGORIES} potjes.` };
  if (enabled.some((d) => d.name.length === 0)) return { error: "Elk potje heeft een naam nodig." };

  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("categories")
    .select("id, swipe_direction")
    .eq("user_id", user.id);
  if (loadError) return { error: "Je potjes konden niet worden geladen." };

  const existingIds = new Set((existing ?? []).map((c) => c.id));
  const hasAnyDirection = (existing ?? []).some((c) => c.swipe_direction !== null);

  // Standaard krijgen de eerste vier aangezette uitgavepotjes een swipe-richting,
  // alleen als er nog geen richtingen zijn gekozen. Aanpassen kan in fase 2.
  let directionIndex = 0;
  const directionFor = (draft: CategoryDraft): SwipeDirection | null => {
    if (hasAnyDirection || draft.isIncome || !draft.enabled) return null;
    if (directionIndex >= DEFAULT_DIRECTION_ORDER.length) return null;
    return DEFAULT_DIRECTION_ORDER[directionIndex++];
  };

  let sortOrder = 0;
  for (const draft of cleaned) {
    const isExisting = draft.id !== undefined && existingIds.has(draft.id);

    if (!draft.enabled && !isExisting) continue;

    const direction = directionFor(draft);

    if (isExisting) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: draft.name,
          icon: draft.icon,
          color: draft.color,
          is_income: draft.isIncome,
          archived: !draft.enabled,
          sort_order: draft.enabled ? sortOrder : 999,
          ...(direction ? { swipe_direction: direction } : {}),
          ...(draft.enabled ? {} : { swipe_direction: null }),
        })
        .eq("id", draft.id!)
        .eq("user_id", user.id);
      if (error) return { error: "Opslaan lukte niet. Probeer het opnieuw." };
    } else {
      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
        is_income: draft.isIncome,
        sort_order: sortOrder,
        swipe_direction: direction,
      });
      if (error) return { error: "Opslaan lukte niet. Probeer het opnieuw." };
    }

    if (draft.enabled) sortOrder++;
  }

  redirect("/onboarding/bron");
}

/** Rondt de onboarding af en start de eerste swipe-sessie. */
export async function finishOnboarding(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, onboarding_done: true }, { onConflict: "id" });

  if (error) throw new Error("Onboarding kon niet worden afgerond.");

  redirect("/swipen");
}
