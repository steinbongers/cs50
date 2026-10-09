import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Zet oude verdelingen (open delen per persoon) om naar bijhouden per uitgave: de uitgave
 * wacht op geld terug, wat al binnen was wijst naar de uitgave en telt in hetzelfde potje.
 * Zo kies je bij Terugbetaling gewoon de uitgave ("Sijf · € 240"), niet elke persoon.
 *
 * Alleen als het netjes kan: geen deel buiten de bank verrekend (dat zit in own_share en zou
 * bij "Ja, de rest is van mij" verdwijnen), en geen terugbetaling die ook delen van een andere
 * uitgave afloste. Anders blijft de oude verdeling staan. Veilig om vaak aan te roepen.
 */
export async function convertOpenSharesToTracking(): Promise<number> {
  const supabase = await createClient();
  const { data: open } = await supabase.from("transaction_shares").select("transaction_id").eq("status", "open");
  const expenseIds = [...new Set((open ?? []).map((s) => s.transaction_id))];
  if (expenseIds.length === 0) return 0;

  const { data: shares } = await supabase
    .from("transaction_shares")
    .select("id, transaction_id, status, received_transaction_id")
    .in("transaction_id", expenseIds);
  const { data: expenses } = await supabase.from("transactions").select("id, category_id, amount").in("id", expenseIds);

  const receivedIds = [...new Set((shares ?? []).map((s) => s.received_transaction_id).filter((id): id is string => Boolean(id)))];
  // Welke uitgaven lost elke terugbetaling af? Meer dan één: niet om te zetten.
  const { data: usedBy } = receivedIds.length
    ? await supabase.from("transaction_shares").select("transaction_id, received_transaction_id").in("received_transaction_id", receivedIds)
    : { data: [] as { transaction_id: string; received_transaction_id: string | null }[] };
  const expensesPerRepayment = new Map<string, Set<string>>();
  for (const row of usedBy ?? []) {
    if (!row.received_transaction_id) continue;
    const set = expensesPerRepayment.get(row.received_transaction_id) ?? new Set<string>();
    set.add(row.transaction_id);
    expensesPerRepayment.set(row.received_transaction_id, set);
  }

  let converted = 0;
  for (const expense of expenses ?? []) {
    if (!expense.category_id || Number(expense.amount) >= 0) continue;
    const own = (shares ?? []).filter((s) => s.transaction_id === expense.id);
    if (own.some((s) => s.status === "settled_elsewhere")) continue;
    const repayments = [...new Set(own.map((s) => s.received_transaction_id).filter((id): id is string => Boolean(id)))];
    if (repayments.some((id) => (expensesPerRepayment.get(id)?.size ?? 0) > 1)) continue;

    if (repayments.length > 0) {
      const { error } = await supabase
        .from("transactions")
        .update({ category_id: expense.category_id, refund_for_id: expense.id })
        .in("id", repayments);
      if (error) continue;
    }
    const { error } = await supabase
      .from("transactions")
      .update({ awaiting_refund: true, own_share: null })
      .eq("id", expense.id);
    if (error) continue;
    await supabase.from("transaction_shares").delete().eq("transaction_id", expense.id);
    converted++;
  }
  return converted;
}
