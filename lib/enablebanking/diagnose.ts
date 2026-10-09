import "server-only";
import { EnableBankingError } from "./client";
import { describePrivateKeyShape } from "./private-key";

/**
 * Technische uitleg van een Enable Banking-fout, alleen voor beheerders en de serverlog.
 * Bevat nooit de sleutel of transactiedata: alleen status, foutcode en de korte foutmelding.
 */
export function describeEnableBankingError(error: unknown): string {
  if (error instanceof EnableBankingError) {
    const code = error.code ? ` (${error.code})` : "";
    const hint =
      error.status === 401 || error.status === 403
        ? " Klopt het applicatie-id bij deze private key, en is de applicatie actief?"
        : "";
    return `Enable Banking antwoordde ${error.status}${code}: ${error.message.slice(0, 160)}.${hint}`;
  }
  if (error instanceof Error) {
    if (/DECODER|PEM|asn1|key/i.test(error.message)) {
      const shape = describePrivateKeyShape(process.env.ENABLE_BANKING_PRIVATE_KEY);
      return `De private key kan niet worden gelezen (${shape}). Plak de hele key in Vercel, met de regels BEGIN en END erbij.`;
    }
    return `${error.name}: ${error.message.slice(0, 160)}`;
  }
  return "Onbekende fout.";
}
