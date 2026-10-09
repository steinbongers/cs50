import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconJar } from "@/components/ui/icons";
import { CheckCheck, Landmark } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ACTION_LABEL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { getPrimaryConnection } from "@/lib/bank/connections";
import { dailyStreak } from "@/lib/insights/compute";
import { loadInsightData } from "@/lib/insights/queries";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import { convertOpenSharesToTracking } from "@/lib/transactions/convert-shares";
import {
  countOpenTransactions,
  getActiveCategories,
  getAwaitingRefunds,
  getOpenShares,
  getOpenTransactions,
} from "@/lib/transactions/queries";
import { SortScreen } from "./sort-screen";

export const metadata: Metadata = { title: ACTION_LABEL };

export default async function SwipenPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const period = currentPeriod(profile.salary_day, amsterdamToday());

  // Oude verdelingen per persoon eerst omzetten naar bijhouden per uitgave.
  await convertOpenSharesToTracking().catch(() => 0);
  const [categories, transactions, totalOpen, openShares, awaitingRefunds] = await Promise.all([
    getActiveCategories(period),
    getOpenTransactions(),
    countOpenTransactions(),
    getOpenShares(),
    getAwaitingRefunds(),
  ]);

  if (categories.filter((c) => c.systemKey === null).length === 0) {
    return (
      <>
        <PageHeader title={ACTION_LABEL} />
        <EmptyState
          icon={<IconJar size={28} />}
          title="Eerst even potjes kiezen"
          description="Zonder potjes valt er niets te kiezen. Dat is zo gebeurd."
          action={<ButtonLink href="/onboarding/potjes">Potjes kiezen</ButtonLink>}
        />
      </>
    );
  }

  if (transactions.length === 0) {
    const supabase = await createClient();
    const today = amsterdamToday();
    const connection = await getPrimaryConnection(supabase, user.id);

    if (!connection) {
      return (
        <>
          <PageHeader title={ACTION_LABEL} />
          <EmptyState
            icon={<Landmark />}
            title="Hier komen je kaartjes"
            description="Zodra je bank gekoppeld is, ligt hier je eerste stapel."
            action={<ButtonLink href="/bank/koppelen?next=/swipen">Bank koppelen</ButtonLink>}
          />
        </>
      );
    }

    const insight = await loadInsightData(supabase, today);
    // Zelfde telling als de streakchip op Overzicht.
    const days = dailyStreak(insight.txs, today).days;

    return (
      <>
        <PageHeader title={ACTION_LABEL} />
        <EmptyState
          icon={<CheckCheck />}
          title="Stapel leeg"
          description="Alles zit in een potje. Nieuwe kaartjes komen vanzelf."
          action={
            <ButtonLink href="/overzicht" variant="secondary">
              Naar je maand
            </ButtonLink>
          }
          footnote={days >= 2 ? `${days} dagen op rij. Lekker bezig.` : undefined}
        />
      </>
    );
  }

  // Geen key op de stapel: een refresh tijdens het sorteren mag de lokale staat
  // (ongedaan maken, beslissingen) niet weggooien. Een nieuwe stapel na een
  // afgeronde ronde neemt SortScreen zelf over uit de nieuwe props.
  return (
    <SortScreen
      key={user.id}
      categories={categories}
      transactions={transactions}
      totalOpen={totalOpen}
      openShares={openShares}
      awaitingRefunds={awaitingRefunds}
      coachStep={profile.coach_step}
    />
  );
}

