"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { toISODate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { CASH_COUNTERPARTY, allocateCashSpend, cashAmount, cashNote } from "@/lib/transactions/cash";
import { loadCashWallet } from "./queries";

type Result = { ok: true } | { ok: false; error: string };
const GENERIC = "Opslaan lukte niet. Probeer het nog eens.";
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

/**
 * Contante uitgave vanaf "Contant over": een eigen regel zonder rekening in het gekozen potje,
 * gekoppeld aan de oudste opname waar nog geld van over is. Past het bedrag daar niet in,
 * dan gaat de rest naar de volgende opname (één regel per opname).
 */
export async function addCashSpend(amount: number, categoryId: string, note: string | null): Promise<Result> {
  const user = await requireUser();
  const value = cashAmount(amount);
  if (value === null) return { ok: false, error: "Vul een bedrag boven € 0 in." };
  if (!isUuid(categoryId)) return { ok: false, error: "Kies een potje." };

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .eq("archived", false)
    .eq("is_income", false)
    .is("system_key", null)
    .maybeSingle();
  if (!category) return { ok: false, error: "Dit potje bestaat niet (meer)." };

  let parts: ReturnType<typeof allocateCashSpend>;
  try {
    const wallet = await loadCashWallet(supabase, user.id);
    parts = allocateCashSpend(value, wallet.buckets);
  } catch {
    return { ok: false, error: GENERIC };
  }
  if (!parts) return { ok: false, error: "Zoveel contant heb je niet meer." };

  const now = new Date().toISOString();
  const bookingDate = toISODate(amsterdamToday());
  const description = cashNote(note);
  const { error } = await supabase.from("transactions").insert(
    parts.map((part) => ({
      user_id: user.id,
      account_id: null,
      source: "cash" as const,
      amount: -part.amount,
      booking_date: bookingDate,
      counterparty: CASH_COUNTERPARTY,
      description,
      category_id: category.id,
      categorized_at: now,
      cash_withdrawal_id: part.withdrawalId,
      dedupe_hash: `cash:${crypto.randomUUID()}`,
    })),
  );
  if (error) return { ok: false, error: GENERIC };

  // Alleen het potje en over hoeveel opnames het ging; nooit het bedrag of de notitie.
  await logEvent("cash_spend_added", { category_id: category.id, parts: parts.length });
  refresh();
  return { ok: true };
}
