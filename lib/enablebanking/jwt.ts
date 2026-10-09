import "server-only";
import { createSign } from "node:crypto";
import { normalizePrivateKey } from "./private-key";

/**
 * JWT voor de Enable Banking API: RS256, kid = application ID,
 * iss "enablebanking.com", aud "api.enablebanking.com", maximaal 24 uur geldig.
 * De private key komt uitsluitend uit een environment variable.
 */
export function createEnableBankingJwt(ttlSeconds = 3600): string {
  const appId = process.env.ENABLE_BANKING_APP_ID;
  const rawKey = process.env.ENABLE_BANKING_PRIVATE_KEY;
  if (!appId || !rawKey) {
    throw new Error("ENABLE_BANKING_APP_ID en ENABLE_BANKING_PRIVATE_KEY ontbreken (zie .env.example).");
  }

  const privateKey = normalizePrivateKey(rawKey);
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ typ: "JWT", alg: "RS256", kid: appId }));
  const payload = base64url(
    JSON.stringify({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: now,
      exp: now + Math.min(ttlSeconds, 86400),
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey, "base64url");

  return `${header}.${payload}.${signature}`;
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function isEnableBankingConfigured(): boolean {
  return Boolean(process.env.ENABLE_BANKING_APP_ID && process.env.ENABLE_BANKING_PRIVATE_KEY);
}
