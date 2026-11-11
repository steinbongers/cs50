import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NativeDeviceRow } from "@/lib/supabase/types";
import { hashDeviceKey, isDeviceExpired } from "./device-key";
import { bearerToken, hashWidgetToken } from "./widget-token";

type Admin = SupabaseClient<Database>;

export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/**
 * Zoekt de iPhone bij `Authorization: Bearer <apparaatsleutel>`. Verlopen sleutels tellen niet.
 * Werkt `last_seen_at` bij (hoogstens eens per uur), maar verlengt de geldigheid niet:
 * dat gebeurt alleen als de app zelf opent en een nieuwe sleutel haalt.
 */
export async function authenticateDevice(admin: Admin, request: Request): Promise<NativeDeviceRow | null> {
  const key = bearerToken(request.headers.get("authorization"));
  if (!key) return null;
  const { data: device, error } = await admin.from("native_devices").select("*").eq("key_hash", hashDeviceKey(key)).maybeSingle();
  if (error) throw new Error("unavailable");
  if (!device || isDeviceExpired(device.expires_at)) return null;
  if (Date.now() - Date.parse(device.last_seen_at) > 60 * 60 * 1000) {
    await admin.from("native_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  }
  return device;
}

/**
 * Voor GET /api/widget: een apparaatsleutel, of de oude widgetsleutel van een eerdere build
 * (die blijft werken tot iedereen de nieuwe build heeft). Geeft de gebruiker terug.
 */
export async function authenticateWidget(admin: Admin, request: Request): Promise<string | null> {
  const device = await authenticateDevice(admin, request);
  if (device) return device.user_id;
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return null;
  const { data: row, error } = await admin.from("widget_tokens").select("user_id").eq("token_hash", hashWidgetToken(token)).maybeSingle();
  if (error) throw new Error("unavailable");
  return row?.user_id ?? null;
}

/** JSON-body van hoogstens `max` bytes; anders null. */
export async function readJson(request: Request, max = 4096): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > max) return null;
  try {
    const text = await request.text();
    if (text.length > max) return null;
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
