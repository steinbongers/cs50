"use server";

import { requireUser } from "@/lib/auth";
import { MAX_GROUPS, validateGroup, type ShareGroup } from "@/lib/groups/groups";
import { createClient } from "@/lib/supabase/server";

// Geen refresh() hier: opslaan vanuit het verdeelpaneel mag de stapel op Swipen niet
// herladen. De groepenpagina ververst zelf met router.refresh().

export type GroupResult = { ok: true; group: ShareGroup } | { ok: false; error: string };
export type GroupActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "Opslaan lukte niet. Probeer het nog eens.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Je eigen groepen, op naam. */
export async function listGroups(): Promise<ShareGroup[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("share_groups")
    .select("id, name, members")
    .eq("user_id", user.id)
    .order("name");
  return data ?? [];
}

export async function createGroup(name: string, members: string[]): Promise<GroupResult> {
  const user = await requireUser();
  const input = validateGroup(name, members);
  if (!input.ok) return input;

  const supabase = await createClient();
  const { count } = await supabase
    .from("share_groups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_GROUPS) return { ok: false, error: `Je kunt maximaal ${MAX_GROUPS} groepen maken.` };

  const { data, error } = await supabase
    .from("share_groups")
    .insert({ user_id: user.id, name: input.name, members: input.members })
    .select("id, name, members")
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };
  return { ok: true, group: data };
}

export async function updateGroup(id: string, name: string, members: string[]): Promise<GroupResult> {
  const user = await requireUser();
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: GENERIC_ERROR };
  const input = validateGroup(name, members);
  if (!input.ok) return input;

  const supabase = await createClient();
  // Alleen je eigen groep: zonder treffer is er niets bijgewerkt.
  const { data, error } = await supabase
    .from("share_groups")
    .update({ name: input.name, members: input.members })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, members")
    .maybeSingle();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };
  return { ok: true, group: data };
}

export async function deleteGroup(id: string): Promise<GroupActionResult> {
  const user = await requireUser();
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, error: "Verwijderen lukte niet." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("share_groups")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Verwijderen lukte niet. Probeer het nog eens." };
  return { ok: true };
}
