import { createHash } from "node:crypto";
import type { EbBalance, EbTransaction } from "@/lib/enablebanking/types";
import type { Database } from "@/lib/supabase/types";
import { cleanCounterparty, cleanDescription, extractTime } from "@/lib/transactions/clean";
import { dedupeHash } from "@/lib/transactions/dedupe";

export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

/** "NL91ABNA0417164300" -> "NL** **** 4300". We bewaren nooit de volledige IBAN. */
export function maskIban(iban: string | null | undefined): string | null {
  const clean = (iban ?? "").replace(/\s+/g, "").toUpperCase();
  if (clean.length < 8) return null;
  return `${clean.slice(0, 2)}** **** ${clean.slice(-4)}`;
}

export function hashIban(iban: string | null | undefined): string | null {
  const clean = (iban ?? "").replace(/\s+/g, "").toUpperCase();
  if (!clean) return null;
  return createHash("sha256").update(clean).digest("hex");
}

/** Boekdatum met terugval op valuta- of transactiedatum. */
export function bookingDateOf(tx: EbTransaction): string | null {
  return tx.booking_date ?? tx.value_date ?? tx.transaction_date ?? null;
}

/**
 * Zet een Enable Banking-transactie om naar onze rij.
 * Geeft null terug voor transacties die we niet opnemen (niet geboekt, geen datum).
 */
export function mapTransaction(
  tx: EbTransaction,
  context: { userId: string; accountId: string; ownIbanHashes: ReadonlySet<string> },
): TransactionInsert | null {
  if (tx.status && tx.status !== "BOOK") return null;
  const bookingDate = bookingDateOf(tx);
  if (!bookingDate) return null;

  const magnitude = Math.abs(Number(tx.transaction_amount.amount));
  if (!Number.isFinite(magnitude)) return null;
  const isCredit = tx.credit_debit_indicator === "CRDT";
  const amount = isCredit ? magnitude : -magnitude;

  // Bij een afschrijving is de ontvanger de tegenpartij, bij een bijschrijving de verzender.
  const party = isCredit ? tx.debtor : tx.creditor;
  const partyIban = isCredit ? tx.debtor_account?.iban : tx.creditor_account?.iban;
  const remittance = (tx.remittance_information ?? []).map((line) => line.trim()).filter(Boolean);
  const rawCounterparty = party?.name?.trim() || remittance[0] || tx.bank_transaction_code?.description || null;
  const rawDescription = remittance.length > 0 ? remittance.join(" ") : (tx.note ?? null);

  const partyHash = hashIban(partyIban);
  const isInternal = partyHash !== null && context.ownIbanHashes.has(partyHash);

  const externalId = tx.entry_reference?.trim() || tx.transaction_id?.trim() || null;
  const time = extractTime(rawDescription);
  const balanceAfterRaw = tx.balance_after_transaction ? Number(tx.balance_after_transaction.amount) : null;
  const balanceAfter = balanceAfterRaw !== null && Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : null;

  return {
    user_id: context.userId,
    account_id: context.accountId,
    external_id: externalId,
    dedupe_hash: dedupeHash({
      externalId,
      bookingDate,
      amount,
      counterparty: rawCounterparty,
      description: rawDescription,
      accountId: context.accountId,
      balanceAfter,
    }),
    booking_date: bookingDate,
    booking_time: time ? `${time}:00` : null,
    amount,
    currency: tx.transaction_amount.currency || "EUR",
    counterparty: cleanCounterparty(rawCounterparty),
    description: cleanDescription(rawDescription),
    raw_counterparty: rawCounterparty,
    raw_description: rawDescription,
    balance_after: balanceAfter,
    is_internal_transfer: isInternal,
    source: "bank",
  };
}

/** Kiest het meest bruikbare saldo: beschikbaar (CLAV/ITAV/XPCD), anders geboekt, anders het eerste. */
export function pickBalance(balances: EbBalance[]): number | null {
  const order = ["CLAV", "ITAV", "XPCD", "CLBD", "ITBD", "OPBD"];
  const sorted = [...balances].sort((a, b) => {
    const ia = order.indexOf(a.balance_type);
    const ib = order.indexOf(b.balance_type);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const chosen = sorted[0];
  if (!chosen) return null;
  const value = Number(chosen.balance_amount.amount);
  return Number.isFinite(value) ? value : null;
}
