"use server";

import { requireUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

/** Markeert 'Jouw maand' als bekeken voor de huidige periode. */
export async function markMonthReviewSeen(periodStartISO: string): Promise<void> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStartISO)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ month_review_seen_for: periodStartISO }).eq("id", user.id);
  await logEvent("month_review_viewed", { period_start: periodStartISO });
}
