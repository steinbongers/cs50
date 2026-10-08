import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { VOORGESCHOTEN_CATEGORY } from "./types";

/**
 * Zorgt dat het ingebouwde potje Voorgeschoten bestaat en geeft het id terug.
 * Het potje telt niet mee als uitgave en staat niet tussen de tegels.
 */
export async function ensureVoorgeschotenCategory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("categories")
    .select("id, archived")
    .eq("user_id", userId)
    .eq("system_key", VOORGESCHOTEN_CATEGORY.systemKey)
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
      name: VOORGESCHOTEN_CATEGORY.name,
      icon: VOORGESCHOTEN_CATEGORY.icon,
      color: VOORGESCHOTEN_CATEGORY.color,
      is_income: false,
      sort_order: 999,
      system_key: VOORGESCHOTEN_CATEGORY.systemKey,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Het potje Voorgeschoten kon niet worden aangemaakt.");
  return data.id;
}
