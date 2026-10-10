"use server";

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
import { ensureVoorgeschotenCategory } from "@/lib/categories/system";
import type { CategoryDraft } from "@/lib/categories/types";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export type { CategoryDraft } from "@/lib/categories/types";

/** Potje uit de onboarding: met of het een eigen potje is en welke snelle suggestie het leverde. */
export type OnboardingCategoryDraft = CategoryDraft & {
  isCustom?: boolean;
  suggestion?: QuickSuggestionKey | null;
};

export type SaveCategoriesResult = { error: string } | undefined;

function isValidDraft(value: unknown): value is OnboardingCategoryDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.id === undefined || typeof v.id === "string") &&
    typeof v.name === "string" &&
    typeof v.icon === "string" &&
    typeof v.color === "string" &&
    typeof v.isIncome === "boolean" &&
    (v.isSavings === undefined || typeof v.isSavings === "boolean") &&
    typeof v.enabled === "boolean" &&
    (v.isCustom === undefined || typeof v.isCustom === "boolean") &&
    (v.suggestion === undefined || v.suggestion === null || isQuickSuggestionKey(v.suggestion))
  );
}

/**
 * Slaat de potjeskeuze uit de onboarding op, in de volgorde van de lijst.
 * - nieuwe, aangezette potjes worden toegevoegd
 * - bestaande potjes worden bijgewerkt; uitgezette worden gearchiveerd
 * - uitgezette potjes uit de startset worden niet opgeslagen
 * Daarna gaat de gebruiker door naar de volgende stap.
 */
export async function saveOnboardingCategories(
  drafts: OnboardingCategoryDraft[],
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
    // Een potje is inkomen óf sparen, nooit allebei.
    isSavings: d.isSavings === undefined ? undefined : d.isSavings && !d.isIncome,
  }));

  const enabled = cleaned.filter((d) => d.enabled);
  if (!enabled.some((d) => !d.isIncome && !d.isSavings)) {
    return { error: "Zet minstens één potje voor je uitgaven aan." };
  }
  if (enabled.length > MAX_CATEGORIES) return { error: `Kies maximaal ${MAX_CATEGORIES} potjes.` };
  if (enabled.some((d) => d.name.length === 0)) return { error: "Elk potje heeft een naam nodig." };

  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .is("system_key", null);
  if (loadError) return { error: "Je potjes konden niet worden geladen." };

  const existingIds = new Set((existing ?? []).map((c) => c.id));

  let sortOrder = 0;
  for (const draft of cleaned) {
    const isExisting = draft.id !== undefined && existingIds.has(draft.id);

    if (!draft.enabled && !isExisting) continue;

    if (isExisting) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: draft.name,
          icon: draft.icon,
          color: draft.color,
          is_income: draft.isIncome,
          ...(draft.isSavings === undefined ? {} : { is_savings: draft.isSavings }),
          archived: !draft.enabled,
          sort_order: draft.enabled ? sortOrder : 998,
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
        is_savings: draft.isSavings ?? false,
        sort_order: sortOrder,
      });
      if (error) return { error: "Opslaan lukte niet. Probeer het opnieuw." };
    }

    if (draft.enabled) sortOrder++;
  }

  // Het ingebouwde potje voor geld dat je terugkrijgt.
  await ensureVoorgeschotenCategory(supabase, user.id);

  // Meting: alleen aantallen en vaste sleutels, nooit namen.
  const custom = enabled.filter((d) => d.isCustom === true && d.id === undefined);
  await logEvent("onboarding_step_done", {
    step: "potjes",
    potjes_count: enabled.length,
    defaults_kept: enabled.filter((d) => d.isCustom !== true && d.id === undefined).length,
  });
  for (const draft of custom) {
    await logEvent("potje_created", { source: "onboarding", suggestion: draft.suggestion ?? null, savings: draft.isSavings === true });
  }

  redirect("/onboarding/salarisdag");
}

/**
 * Rondt de onboarding af; het startscherm (/) kiest zelf Swipen of Overzicht.
 * Met `next=bank` (zonder koppeling op het klaar-scherm) gaat het meteen door naar de bank.
 */
export async function finishOnboarding(formData?: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, onboarding_done: true }, { onConflict: "id" });

  if (error) throw new Error("Onboarding kon niet worden afgerond.");

  redirect(formData?.get("next") === "bank" ? "/bank/koppelen?next=/overzicht" : "/");
}
