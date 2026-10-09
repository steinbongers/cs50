/** Tijdelijke cookie tijdens het koppelen van een bank (state-controle). */
export const BANK_AUTH_COOKIE = "bank_auth";

export interface BankAuthCookie {
  state: string;
  aspsp: string;
  next: string;
  reconnect: boolean;
  /** Eerste koppeling: vanaf wanneer kaartjes ophalen (zie lib/bank/import-from.ts). */
  importFrom?: string;
}
