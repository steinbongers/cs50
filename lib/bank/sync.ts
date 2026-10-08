import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EnableBankingError, getAccountBalances, getAccountTransactions } from "@/lib/enablebanking/client";
import { toISODate } from "@/lib/format";
import type { BankConnectionRow, ConnectionStatus, Database } from "@/lib/supabase/types";
import { statusFor } from "./connections";
import { mapTransaction, pickBalance, type TransactionInsert } from "./mapping";

export interface SyncResult {
  inserted: number;
  accounts: number;
  status: ConnectionStatus;
  error?: string;
}

const MAX_PAGES_PER_ACCOUNT = 30;
/** Bij een vervolgsync kijken we een paar dagen terug: banken boeken soms met vertraging. */
const OVERLAP_DAYS = 3;

/**
 * Haalt nieuwe transacties en saldi op voor één bankkoppeling.
 * Werkt met een gebruikersclient (handmatig verversen) én met de service-role
 * client (cron). Logt nooit transactiedata.
 */
export async function syncConnection(
  supabase: SupabaseClient<Database>,
  connection: BankConnectionRow,
  options: { dateFrom?: string; manual?: boolean } = {},
): Promise<SyncResult> {
  const now = new Date();
  const userId = connection.user_id;

  const [{ data: accounts }, { data: ownAccounts }] = await Promise.all([
    supabase.from("accounts").select("*").eq("connection_id", connection.id),
    supabase.from("accounts").select("iban_hash").eq("user_id", userId),
  ]);
  const ownIbanHashes = new Set((ownAccounts ?? []).map((a) => a.iban_hash).filter((h): h is string => Boolean(h)));

  let inserted = 0;
  let syncedAccounts = 0;
  let error: string | undefined;
  let status: ConnectionStatus = statusFor(connection, now);

  if (status === "revoked" || status === "expired") {
    await supabase.from("bank_connections").update({ status }).eq("id", connection.id);
    return { inserted: 0, accounts: 0, status, error: "De bankkoppeling is niet meer geldig." };
  }

  for (const account of accounts ?? []) {
    if (!account.external_uid) continue;
    try {
      const dateFrom =
        options.dateFrom ??
        (account.last_synced_at
          ? toISODate(new Date(new Date(account.last_synced_at).getTime() - OVERLAP_DAYS * 864e5))
          : toISODate(new Date(now.getTime() - 30 * 864e5)));

      let continuationKey: string | null | undefined = null;
      let pages = 0;
      const rows: TransactionInsert[] = [];
      do {
        const page = await getAccountTransactions(account.external_uid, { dateFrom, continuationKey });
        for (const tx of page.transactions ?? []) {
          const row = mapTransaction(tx, { userId, accountId: account.id, ownIbanHashes });
          if (row) rows.push(row);
        }
        continuationKey = page.continuation_key ?? null;
        pages++;
      } while (continuationKey && pages < MAX_PAGES_PER_ACCOUNT);

      // Ontdubbelen binnen de batch én tegen de database (unique user_id + dedupe_hash).
      const unique = new Map<string, TransactionInsert>();
      for (const row of rows) unique.set(row.dedupe_hash, row);
      if (unique.size > 0) {
        const { data: insertedRows, error: insertError } = await supabase
          .from("transactions")
          .upsert([...unique.values()], { onConflict: "user_id,dedupe_hash", ignoreDuplicates: true })
          .select("id");
        if (insertError) throw new Error("Transacties konden niet worden opgeslagen.");
        inserted += insertedRows?.length ?? 0;
      }

      let lastBalance = account.last_balance;
      try {
        const balances = await getAccountBalances(account.external_uid);
        const picked = pickBalance(balances.balances ?? []);
        if (picked !== null) lastBalance = picked;
      } catch {
        // saldo is een extra; een fout hier mag de sync niet breken
      }

      await supabase
        .from("accounts")
        .update({ last_balance: lastBalance, last_synced_at: now.toISOString() })
        .eq("id", account.id);
      syncedAccounts++;
    } catch (err) {
      if (err instanceof EnableBankingError && err.needsReconnect) {
        status = statusFor(connection, now) === "expired" ? "expired" : "revoked";
        error = "De bank accepteert de koppeling niet meer. Koppel opnieuw.";
        break;
      }
      error = err instanceof Error ? err.message : "Synchroniseren mislukte.";
    }
  }

  await supabase
    .from("bank_connections")
    .update({
      status,
      last_synced_at: now.toISOString(),
      last_error: error ?? null,
      ...(options.manual ? { last_manual_sync_at: now.toISOString() } : {}),
    })
    .eq("id", connection.id);

  return { inserted, accounts: syncedAccounts, status, error };
}
