import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheck, IconJar } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ACTION_LABEL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { currentPeriod } from "@/lib/periods";
import {
  countOpenTransactions,
  getActiveCategories,
  getOpenShares,
  getOpenTransactions,
} from "@/lib/transactions/queries";
import { SortScreen } from "./sort-screen";

export const metadata: Metadata = { title: ACTION_LABEL };

export default async function SwipenPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const period = currentPeriod(profile.salary_day);

  const [categories, transactions, totalOpen, openShares] = await Promise.all([
    getActiveCategories(period),
    getOpenTransactions(),
    countOpenTransactions(),
    getOpenShares(),
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
    return (
      <>
        <PageHeader title={ACTION_LABEL} />
        <EmptyState
          icon={<IconCheck size={28} />}
          title="Alles zit in een potje"
          description="Niets te doen hier. Zodra er nieuwe transacties binnenkomen, staan ze voor je klaar."
          action={
            <ButtonLink href="/overzicht" variant="secondary">
              Naar het overzicht
            </ButtonLink>
          }
        />
      </>
    );
  }

  // De key zorgt dat een nieuwe stapel (na router.refresh) met schone staat start.
  const batchKey = `${transactions[0].id}:${totalOpen}`;

  return (
    <SortScreen
      key={batchKey}
      categories={categories}
      transactions={transactions}
      totalOpen={totalOpen}
      openShares={openShares}
      coachStep={profile.coach_step}
    />
  );
}

