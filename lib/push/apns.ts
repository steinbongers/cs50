import "server-only";
import { connect, type ClientHttp2Session } from "node:http2";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NativeDeviceRow } from "@/lib/supabase/types";
import { createApnsJwt } from "./apns-jwt";

/**
 * Native meldingen naar de iPhone-app via Apple (APNs), over HTTP/2 met een ES256-token.
 * Alleen deze meldingen kunnen knoppen hebben. Webpush (lib/push/server.ts) blijft voor Safari.
 * Logt nooit de inhoud van een melding.
 */

const HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
} as const;

let cachedJwt: { token: string; at: number } | null = null;

export function isApnsConfigured(): boolean {
  return Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID);
}

function jwt(): string | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  if (!keyId || !teamId || !privateKey) return null;
  // Apple: niet vaker dan eens per 20 minuten een nieuw token, en hoogstens een uur oud.
  if (cachedJwt && Date.now() - cachedJwt.at < 40 * 60 * 1000) return cachedJwt.token;
  try {
    cachedJwt = { token: createApnsJwt({ keyId, teamId, privateKey }), at: Date.now() };
    return cachedJwt.token;
  } catch {
    return null;
  }
}

type SendOutcome = "sent" | "gone" | "failed";

function post(session: ClientHttp2Session, deviceToken: string, body: string, collapseId?: string): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve) => {
    const token = jwt();
    if (!token) return resolve({ status: 0 });
    const req = session.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      "apns-topic": process.env.APNS_BUNDLE_ID ?? "",
      "apns-push-type": "alert",
      "apns-priority": "10",
      // Na 12 uur heeft een melding over een betaling geen zin meer.
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 12 * 3600),
      ...(collapseId ? { "apns-collapse-id": collapseId.slice(0, 64) } : {}),
      "content-type": "application/json",
    });
    let status = 0;
    let data = "";
    req.setTimeout(10_000, () => req.close());
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      if (data.length < 500) data += chunk;
    });
    req.on("end", () => {
      let reason: string | undefined;
      try {
        reason = (JSON.parse(data) as { reason?: string }).reason;
      } catch {
        // geen JSON: dan is het gelukt (lege body) of iets onbekends
      }
      resolve({ status, reason });
    });
    req.on("error", () => resolve({ status: 0 }));
    req.end(body);
  });
}

/** Opent per omgeving één verbinding; sluit ze met `close()`. */
export function createApnsSender() {
  const sessions = new Map<string, ClientHttp2Session>();
  function session(env: "production" | "sandbox"): ClientHttp2Session {
    let s = sessions.get(env);
    if (!s || s.closed || s.destroyed) {
      s = connect(HOSTS[env]);
      s.on("error", () => {});
      sessions.set(env, s);
    }
    return s;
  }
  return {
    async send(device: Pick<NativeDeviceRow, "apns_token" | "apns_env">, body: string, collapseId?: string): Promise<SendOutcome> {
      if (!device.apns_token || !isApnsConfigured()) return "failed";
      const env = device.apns_env === "sandbox" ? "sandbox" : "production";
      const { status, reason } = await post(session(env), device.apns_token, body, collapseId);
      if (status === 200) return "sent";
      if (status === 410 || reason === "BadDeviceToken" || reason === "Unregistered" || reason === "DeviceTokenNotForTopic") return "gone";
      return "failed";
    },
    close() {
      for (const s of sessions.values()) s.close();
      sessions.clear();
    },
  };
}

export type ApnsSender = ReturnType<typeof createApnsSender>;

/** Apparaten van een gebruiker die meldingen kunnen krijgen (token aanwezig, niet verlopen). */
export async function pushDevicesFor(supabase: SupabaseClient<Database>, userId: string): Promise<NativeDeviceRow[]> {
  const { data } = await supabase
    .from("native_devices")
    .select("*")
    .eq("user_id", userId)
    .not("apns_token", "is", null)
    .gt("expires_at", new Date().toISOString());
  return data ?? [];
}

/** Apple zegt dat een token niet meer bestaat: weghalen, de koppeling zelf blijft. */
export async function forgetApnsToken(supabase: SupabaseClient<Database>, deviceId: string): Promise<void> {
  await supabase.from("native_devices").update({ apns_token: null }).eq("id", deviceId);
}
