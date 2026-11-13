"use server";

import { requireUser } from "@/lib/auth";
import { ensureContantCategory, ensureVerdeeldCategory } from "@/lib/categories/system";
import { logEvent } from "@/lib/events";
import { toISODate } from "@/lib/format";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { CASH_COUNTERPARTY, MAX_CASH_SPENDS, cashAmount, cashNote, isCashWithdrawal } from "@/lib/transactions/cash";
import { isCreditCardSettlement } from "@/lib/transactions/credit-card";
import { checkSplitParts, type SplitPartInput } from "@/lib/transactions/split-parts";
import { GENERIC_ERROR, cashCandidate, coachFlag, isUuid, type SwipeMeta } from "./action-helpers";

export interface CashSpendInput {
  categoryId: string;
  /** Positief bedrag in euro's. */
  amount: number;
}

type SplitCashResult = { ok: true; spendIds: string[] } | { ok: false; error: string };

/**
 * Pinopname: waar ging het contante geld heen? Elke uitgave wordt een eigen regel zonder rekening
 * (source 'cash') in het gekozen potje, gekoppeld aan de opname. De opname zelf gaat in het
 * ingebouwde potje Contant, zodat ze niet als uitgave telt; wat er over is blijft in je portemonnee.
 * Zonder uitgaven ("Nog niet uitgegeven") blijft het hele bedrag contant.
 */
export async function splitCash(
  transactionId: string,
  spends: CashSpendInput[],
  note: string | null,
  durationMs: number,
  meta?: SwipeMeta,
): Promise<SplitCashResult> {
  const user = await requireUser();
  if (!isUuid(transactionId) || !Array.isArray(spends) || spends.length > MAX_CASH_SPENDS) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const parsed: { categoryId: string; amount: number }[] = [];
  for (const spend of spends) {
    const amount = cashAmount(spend?.amount);
    if (!isUuid(spend?.categoryId) || amount === null) return { ok: false, error: "Vul bedragen boven € 0 in." };
    parsed.push({ categoryId: spend.categoryId, amount });
  }
  const categoryIds = [...new Set(parsed.map((s) => s.categoryId))];
  if (categoryIds.length !== parsed.length) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, amount, source, category_id, skipped_count, counterparty, description, raw_counterparty, raw_description")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!transaction || transaction.source === "cash" || !isCashWithdrawal(cashCandidate(transaction))) {
    return { ok: false, error: "Dit is geen pinopname." };
  }
  if (transaction.category_id !== null) return { ok: false, error: "Dit kaartje zit al in een potje." };

  const withdrawn = Math.abs(Number(transaction.amount));
  const total = Math.round(parsed.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
  if (total > withdrawn) return { ok: false, error: "Dat is meer dan je hebt opgenomen." };

  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("archived", false)
      .eq("is_income", false)
      .is("system_key", null)
      .in("id", categoryIds);
    if ((categories ?? []).length !== categoryIds.length) return { ok: false, error: "Een van de potjes bestaat niet (meer)." };
  }

  let contantId: string;
  try {
    contantId = await ensureContantCategory(supabase, user.id);
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const now = new Date().toISOString();

  // Eerst de opname zelf (alleen als hij nog open is); de uitgaven pas daarna.
  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: contantId, categorized_at: now, own_share: null })
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };
  await supabase.from("transaction_shares").delete().eq("transaction_id", transactionId).eq("user_id", user.id);

  let spendIds: string[] = [];
  if (parsed.length > 0) {
    const description = cashNote(note);
    const bookingDate = toISODate(amsterdamToday());
    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert(
        parsed.map((s) => ({
          user_id: user.id,
          account_id: null,
          source: "cash" as const,
          amount: -s.amount,
          booking_date: bookingDate,
          counterparty: CASH_COUNTERPARTY,
          description,
          category_id: s.categoryId,
          categorized_at: now,
          cash_withdrawal_id: transactionId,
          dedupe_hash: `cash:${crypto.randomUUID()}`,
        })),
      )
      .select("id");
    if (insertError || !inserted) {
      // Terugdraaien: liever de opname opnieuw op de stapel dan een halve verdeling.
      await supabase
        .from("transactions")
        .update({ category_id: null, categorized_at: null })
        .eq("id", transactionId)
        .eq("user_id", user.id);
      return { ok: false, error: GENERIC_ERROR };
    }
    spendIds = inserted.map((t) => t.id);
  }

  await logEvent("swipe", {
    transaction_id: transactionId,
    category_id: contantId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: transaction.skipped_count,
    coach: coachFlag(meta),
    flow: "cash",
  });
  // Alleen aantallen en of er iets overblijft; nooit bedragen of de notitie.
  await logEvent("cash_split", {
    spends: parsed.length,
    kept: parsed.length === 0 ? "all" : total < withdrawn ? "some" : "none",
  });

  return { ok: true, spendIds };
}

type SplitTransactionResult = { ok: true; partIds: string[] } | { ok: false; error: string };

const SPLIT_ERRORS = {
  count: "Verdeel over minstens twee potjes.",
  amount: "Vul bedragen boven € 0 in.",
  duplicate: "Elk potje maar één keer.",
  sum: "De delen tellen niet op tot het hele bedrag.",
} as const;

/**
 * Eén afschrijving (vaak de creditcard) verdelen over meerdere potjes. Elk deel wordt een eigen
 * regel zonder rekening (source 'split') in het gekozen potje, met dezelfde datum en tegenpartij,
 * gekoppeld aan de afschrijving. De afschrijving zelf gaat in het ingebouwde potje Verdeeld, zodat
 * ze niet dubbel telt. De delen tellen in centen precies op tot het bedrag.
 */
export async function splitTransaction(
  parentId: string,
  parts: SplitPartInput[],
  durationMs: number,
  meta?: SwipeMeta,
): Promise<SplitTransactionResult> {
  const user = await requireUser();
  if (!isUuid(parentId) || !Array.isArray(parts) || !parts.every((p) => isUuid(p?.categoryId))) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data: parent } = await supabase
    .from("transactions")
    .select(
      "id, amount, source, category_id, skipped_count, booking_date, counterparty, description, raw_counterparty, raw_description",
    )
    .eq("id", parentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!parent) return { ok: false, error: GENERIC_ERROR };
  if (parent.category_id !== null) return { ok: false, error: "Dit kaartje zit al in een potje." };
  // Een pinopname verdeel je via Contant; contante uitgaven verdeel je niet nog eens. Een deel (source
  // 'split') is alleen open als het de rest van een creditcard-afrekening is (card-actions.ts): die mag wel.
  if (parent.source === "cash" || isCashWithdrawal(cashCandidate(parent))) {
    return { ok: false, error: "Dit kaartje kun je zo niet verdelen." };
  }

  const amount = Number(parent.amount);
  const check = checkSplitParts(amount, parts);
  if (!check.ok) return { ok: false, error: SPLIT_ERRORS[check.reason] };

  const categoryIds = check.parts.map((p) => p.categoryId);
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("archived", false)
    .eq("is_income", false)
    .is("system_key", null)
    .in("id", categoryIds);
  if ((categories ?? []).length !== categoryIds.length) return { ok: false, error: "Een van de potjes bestaat niet (meer)." };

  let verdeeldId: string;
  try {
    verdeeldId = await ensureVerdeeldCategory(supabase, user.id);
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  const now = new Date().toISOString();

  // Eerst de afschrijving zelf (alleen als hij nog open is); de delen pas daarna.
  const { data: updated, error } = await supabase
    .from("transactions")
    .update({ category_id: verdeeldId, categorized_at: now, own_share: null, awaiting_refund: false })
    .eq("id", parentId)
    .eq("user_id", user.id)
    .is("category_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { ok: false, error: GENERIC_ERROR };
  await supabase.from("transaction_shares").delete().eq("transaction_id", parentId).eq("user_id", user.id);

  // Elk deel krijgt het teken van de afschrijving: een uitgave blijft een uitgave.
  const sign = amount < 0 ? -1 : 1;
  const { data: inserted, error: insertError } = await supabase
    .from("transactions")
    .insert(
      check.parts.map((p) => ({
        user_id: user.id,
        account_id: null,
        source: "split" as const,
        amount: (sign * p.cents) / 100,
        booking_date: parent.booking_date,
        counterparty: parent.counterparty,
        description: p.note,
        category_id: p.categoryId,
        categorized_at: now,
        split_parent_id: parentId,
        dedupe_hash: `split:${crypto.randomUUID()}`,
      })),
    )
    .select("id");
  if (insertError || !inserted) {
    // Terugdraaien: liever de afschrijving opnieuw op de stapel dan een halve verdeling.
    await supabase
      .from("transactions")
      .update({ category_id: null, categorized_at: null })
      .eq("id", parentId)
      .eq("user_id", user.id);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Alleen het aantal potjes en of het een herkende creditcard was; nooit bedragen of notities.
  await logEvent("swipe", {
    transaction_id: parentId,
    category_id: verdeeldId,
    duration_ms: Math.max(0, Math.round(Number.isFinite(durationMs) ? durationMs : 0)),
    skipped_before: parent.skipped_count,
    coach: coachFlag(meta),
    flow: "split_parts",
    parts: check.parts.length,
    credit_card: isCreditCardSettlement(cashCandidate(parent)),
  });

  return { ok: true, partIds: inserted.map((t) => t.id) };
}
