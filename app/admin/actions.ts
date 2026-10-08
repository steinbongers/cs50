"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { isAdminUser } from "@/lib/admin/access";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true; code?: string } | { ok: false; error: string };

function generateCode(): string {
  // Leesbare code zonder verwarrende tekens, 8 willekeurige tekens (32^8 mogelijkheden),
  // bijvoorbeeld PILOT-K7M2X9QD: niet te raden met de openbare registratie-actie.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `PILOT-${out}`;
}

/** Maakt een uitnodigingscode aan (alleen admins). */
export async function createInviteCode(input: { note: string; maxUses: number }): Promise<Result> {
  const user = await requireUser();
  if (!isAdminUser(user)) return { ok: false, error: "Geen toegang." };
  const maxUses = Number.isInteger(input.maxUses) && input.maxUses > 0 && input.maxUses <= 100 ? input.maxUses : 1;
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 80) : "";

  const admin = createAdminClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("invite_codes").insert({ code, note: note || null, max_uses: maxUses });
    if (!error) {
      refresh();
      return { ok: true, code };
    }
  }
  return { ok: false, error: "Code aanmaken lukte niet. Probeer het nog eens." };
}

/** Zet een code op 'op' zodat hij niet meer gebruikt kan worden. */
export async function disableInviteCode(code: string): Promise<Result> {
  const user = await requireUser();
  if (!isAdminUser(user)) return { ok: false, error: "Geen toegang." };
  const admin = createAdminClient();
  const { error } = await admin.from("invite_codes").update({ expires_at: new Date().toISOString() }).eq("code", code);
  if (error) return { ok: false, error: "Uitschakelen lukte niet." };
  refresh();
  return { ok: true };
}
