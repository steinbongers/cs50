import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { CONTANT_CATEGORY, VOORGESCHOTEN_CATEGORY } from "./types";

type SystemCategory = typeof VOORGESCHOTEN_CATEGORY | typeof CONTANT_CATEGORY;

/** Zoekt een ingebouwd potje op (en zet het terug als het gearchiveerd was), of maakt het aan. */
async function ensureSystemCategory(
  supabase: SupabaseClient<Database>,
  userId: string,
  system: SystemCategory,
  sortOrder: number,
): Promise<string> {
  const { data: existing } = await supabase
    .from("categories")
    .select("id, archived")
    .eq("user_id", userId)
    .eq("system_key", system.systemKey)
    .maybeSingle();

  if (existing) {
    if (existing.archived) {
      await supabase.from("categories").update({ archived: false }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name: system.name,
      icon: system.icon,
      color: system.color,
      is_income: false,
      sort_order: sortOrder,
      system_key: system.systemKey,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Het potje ${system.name} kon niet worden aangemaakt.`);
  return data.id;
}

/**
 * Zorgt dat het ingebouwde potje Voorgeschoten bestaat en geeft het id terug.
 * Het potje telt niet mee als uitgave en staat niet tussen de tegels.
 */
export async function ensureVoorgeschotenCategory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  return ensureSystemCategory(supabase, userId, VOORGESCHOTEN_CATEGORY, 999);
}

/**
 * Zorgt dat het ingebouwde potje Contant bestaat en geeft het id terug. Pinopnames waarvan
 * (een deel) nog in je portemonnee zit, staan hierin. Telt niet mee als uitgave, geen tegel.
 */
export async function ensureContantCategory(supabase: SupabaseClient<Database>, userId: string): Promise<string> {
  return ensureSystemCategory(supabase, userId, CONTANT_CATEGORY, 998);
}
