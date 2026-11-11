import { createHash, randomBytes } from "node:crypto";

/**
 * Apparaatsleutel: per gekoppelde iPhone (tabel native_devices) een willekeurige sleutel waarmee
 * de widget, de Apple Pay-actie en de knoppen in een melding zich melden zonder inlogsessie.
 *
 * - In de database staat alleen de sha256-hash.
 * - Op de iPhone staat hij in de Keychain (gedeeld met de widget via de App Group).
 * - Elke keer dat de app opent, komt er een nieuwe; zonder de app te openen vervalt hij na 30 dagen.
 * - Uitloggen of "Ontkoppel" trekt hem in.
 *
 * De vorm is dezelfde als de oude widgetsleutel, zodat `bearerToken` hem ook herkent.
 */

export const DEVICE_KEY_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function generateDeviceKey(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function deviceKeyExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + DEVICE_KEY_TTL_DAYS * DAY_MS).toISOString();
}

export function isDeviceExpired(expiresAt: string, now: Date = new Date()): boolean {
  const t = Date.parse(expiresAt);
  return !Number.isFinite(t) || t <= now.getTime();
}

/** Installatie-id van de app: een UUID die de iPhone zelf maakt en in de Keychain bewaart. */
export function isInstallationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** APNs-apparaattoken: hex, 64 tekens nu, maar Apple belooft geen vaste lengte. */
export function isApnsToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{32,200}$/i.test(value);
}
