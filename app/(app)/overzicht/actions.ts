"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; settled: number } | { ok: false; error: string };

const DAY_MS = 864e5;
/** Zoveel delen handel je hoogstens in één keer af. */
const MAX_SHARES = 200;
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

/** Markeert 'Jouw maand' als bekeken voor de huidige periode. */
export async function markMonthReviewSeen(periodStartISO: string): Promise<void> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStartISO)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ month_review_seen_for: periodStartISO }).eq("id", user.id);
  await logEvent("month_review_viewed", { period_start: periodStartISO });
}

/**
 * Maandafsluiting: het potje waar je deze periode op let. De periode bepaalt de
 * server zelf; het potje moet van jou zijn, actief, en geen Inkomen of systeempotje.
 */
export async function setMonthFocus(categoryId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isUuid(categoryId)) return { ok: false };
  const supabase = await createClient();
  const [{ data: category }, { data: profile }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, is_income, system_key, archived")
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("salary_day").eq("id", user.id).maybeSingle(),
  ]);
  if (!category || category.archived || category.is_income || category.system_key !== null) return { ok: false };

  const period = currentPeriod(profile?.salary_day ?? null, amsterdamToday());
  const { error } = await supabase
    .from("profiles")
    .update({ focus_category_id: category.id, focus_period_start: period.startISO })
    .eq("id", user.id);
  if (error) return { ok: false };
  refresh();
  return { ok: true };
}

/** Meting: welke maand iemand op het overzicht bekijkt (0 = deze maand, tot 3 terug). */
export async function logMonthViewed(monthsBack: number): Promise<void> {
  await requireUser();
  if (!Number.isInteger(monthsBack) || monthsBack < 0 || monthsBack > 3) return;
  await logEvent("month_viewed", { months_back: monthsBack });
}

/**
 * "Alles van Sanne ontvangen": zet alle meegegeven delen die nog open staan en van
 * jou zijn op 'received'. Delen van een ander of die al afgehandeld zijn, blijven
 * ongemoeid. Logt per deel alleen hoe en hoe oud; nooit bedrag of naam.
 */
export async function settlePersonShares(shareIds: string[]): Promise<Result> {
  const user = await requireUser();
  if (!Array.isArray(shareIds) || shareIds.length === 0 || shareIds.length > MAX_SHARES || !shareIds.every(isUuid)) {
    return { ok: false, error: "Dat lukte niet. Probeer het nog eens." };
  }
  const ids = [...new Set(shareIds)];
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("transaction_shares")
    .update({ status: "received", received_at: now })
    .eq("user_id", user.id)
    .eq("status", "open")
    .in("id", ids)
    .select("id, created_at");
  if (error) return { ok: false, error: "Dat lukte niet. Probeer het nog eens. Je gegevens zijn veilig." };

  const nowMs = Date.parse(now);
  await Promise.all(
    (data ?? []).map((share) =>
      logEvent("share_settled", {
        how: "person_all",
        age_days: Math.max(0, Math.floor((nowMs - Date.parse(share.created_at)) / DAY_MS)),
      }),
    ),
  );

  refresh();
  return { ok: true, settled: data?.length ?? 0 };
}
