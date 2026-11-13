import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Actiesleutel in een melding: ondertekend bewijs dat "Klopt" bij precies deze betaling,
 * dit potje en deze gebruiker hoort. Kort geldig (48 uur). De knop werkt alleen met deze
 * sleutel én een geldige apparaatsleutel van dezelfde gebruiker.
 *
 * Vorm: base64url(json).base64url(hmac-sha256). Het geheim staat alleen in Vercel
 * (NATIVE_ACTION_SECRET), nooit in de repo.
 */

export const ACTION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

interface ActionClaims {
  /** Gebruiker */
  u: string;
  /** Transactie */
  t: string;
  /** Voorgesteld potje */
  c: string;
  /** Verloopt (ms sinds 1970) */
  e: number;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("base64url");
}

export function actionSecretFromEnv(): string | null {
  const secret = process.env.NATIVE_ACTION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function createActionToken(
  claims: { userId: string; transactionId: string; categoryId: string },
  secret: string,
  now: number = Date.now(),
): string {
  const payload: ActionClaims = { u: claims.userId, t: claims.transactionId, c: claims.categoryId, e: now + ACTION_TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** Geeft de inhoud terug als handtekening klopt en de sleutel niet verlopen is; anders null. */
export function verifyActionToken(token: unknown, secret: string, now: number = Date.now()): ActionClaims | null {
  if (typeof token !== "string" || token.length > 600) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, signature] = parts;
  const expected = Buffer.from(sign(body, secret), "utf8");
  const given = Buffer.from(signature, "utf8");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof claims !== "object" || claims === null) return null;
  const c = claims as Record<string, unknown>;
  if (typeof c.u !== "string" || typeof c.t !== "string" || typeof c.c !== "string" || typeof c.e !== "number") return null;
  if (c.e <= now) return null;
  return { u: c.u, t: c.t, c: c.c, e: c.e };
}
