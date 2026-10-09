import { Repeat } from "lucide-react";
import type { Metadata } from "next";
import { recurringSummary, usualDayText } from "@/components/overview/overview-copy";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ensureProfile, requireUser } from "@/lib/auth";
import { formatEuro } from "@/lib/format";
import { loadRecurringCharges } from "@/lib/insights/free-to-spend";
import { recurringMonthlyTotal } from "@/lib/insights/recurring";
import { amsterdamToday } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vaste lasten en abonnementen" };

/** Alleen inzicht: wat elke maand terugkomt. Opzeggen doe je zelf, buiten de app. */
export default async function VasteLastenPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const supabase = await createClient();
  const charges = await loadRecurringCharges(supabase, user.id, profile.salary_day, amsterdamToday());
  const total = recurringMonthlyTotal(charges);

  return (
    <>
      <PageHeader title="Vaste lasten" subtitle="En abonnementen" backHref="/overzicht" />
      <div className="flex flex-col gap-4 px-4 pb-8">
        {charges.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Repeat />}
              title="Nog geen vaste lasten gevonden"
              description="Betalingen die elke maand terugkomen, zie je hier vanzelf."
            />
          </Card>
        ) : (
          <>
            <p className="px-1 text-[15px]">{recurringSummary(total, charges.length)}</p>
            <Card padding="none">
              <ul className="divide-y">
                {charges.map((c) => (
                  <li key={c.key} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{c.name}</span>
                      <span className="block text-[13px] leading-[18px] text-text-muted">
                        {usualDayText(c.usualDay)}
                        {c.paidThisPeriod ? " · deze maand betaald" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatEuro(c.averageAmount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <p className="px-1 text-[13px] leading-[18px] text-text-muted">
              Herkend aan betalingen die in minstens twee van de laatste drie maanden terugkwamen, met ongeveer hetzelfde
              bedrag. Het bedrag is een gemiddelde.
            </p>
          </>
        )}
      </div>
    </>
  );
}
