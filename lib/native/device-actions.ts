"use server";

import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PreviewSetting } from "@/lib/supabase/types";
import { deviceKeyExpiry, generateDeviceKey, hashDeviceKey, isApnsToken, isInstallationId } from "./device-key";

export type LinkResult = { ok: true; key: string; expiresAt: string } | { ok: false; error: string };

export interface LinkInput {
  installationId: string;
  apnsToken?: string | null;
  apnsEnv?: "production" | "sandbox" | null;
  previews?: PreviewSetting | null;
}

const PREVIEWS = new Set<PreviewSetting>(["always", "when_unlocked", "never"]);

/**
 * Koppelt deze iPhone (of ververst de koppeling): nieuwe apparaatsleutel, 30 dagen geldig.
 * De app roept dit aan bij elke keer openen, zodat een sleutel nooit lang meegaat.
 * native_devices is alleen voor de service role, daarom eerst requireUser.
 */
export async function linkDevice(input: LinkInput): Promise<LinkResult> {
  const user = await requireUser();
  if (!input || !isInstallationId(input.installationId)) return { ok: false, error: "Ongeldig toestel." };
  const apnsToken = isApnsToken(input.apnsToken) ? input.apnsToken.toLowerCase() : null;
  const apnsEnv = input.apnsEnv === "sandbox" ? "sandbox" : "production";
  const previews = input.previews && PREVIEWS.has(input.previews) ? input.previews : "when_unlocked";

  const key = generateDeviceKey();
  const expiresAt = deviceKeyExpiry();
  const admin = createAdminClient();
  const installationId = input.installationId.toLowerCase();

  // Hetzelfde APNs-token hoort maar bij één account: na wisselen van account geen meldingen van het oude.
  if (apnsToken) await admin.from("native_devices").update({ apns_token: null }).eq("apns_token", apnsToken).neq("user_id", user.id);

  const { data: existing } = await admin
    .from("native_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("installation_id", installationId)
    .maybeSingle();
  const now = new Date().toISOString();
  const { error } = await admin.from("native_devices").upsert(
    {
      user_id: user.id,
      installation_id: installationId,
      key_hash: hashDeviceKey(key),
      ...(apnsToken ? { apns_token: apnsToken, apns_env: apnsEnv } : {}),
      previews,
      last_seen_at: now,
      expires_at: expiresAt,
    },
    { onConflict: "user_id,installation_id" },
  );
  if (error) return { ok: false, error: "Koppelen lukte niet. Probeer het later opnieuw." };
  if (!existing) await logEvent("device_linked", { push: Boolean(apnsToken), previews });
  return { ok: true, key, expiresAt };
}

/** Ontkoppelt deze iPhone (bij uitloggen of met de knop in Instellingen). */
export async function unlinkDevice(installationId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isInstallationId(installationId)) return { ok: false };
  const admin = createAdminClient();
  const { error } = await admin
    .from("native_devices")
    .delete()
    .eq("user_id", user.id)
    .eq("installation_id", installationId.toLowerCase());
  return { ok: !error };
}
