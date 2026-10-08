import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheck, IconJar } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ACTION_LABEL } from "@/config/app";
import { ensureProfile, requireUser } from "@/lib/auth";
import { amsterdamToday, currentPeriod } from "@/lib/periods";
import { createClient } from "@/lib/supabase/server";
import {
  countOpenTransactions,
  getActiveCategories,
  getOpenShares,
  getOpenTransactions,
} from "@/lib/transactions/queries";
import { SortScreen } from "./sort-screen";

export const metadata: Metadata = { title: ACTION_LABEL };

const MAX_KNOWN_NAMES = 20;

/** Eerder ingevulde namen van anderen, als suggesties bij het verdelen. Uniek, nieuwste eerst. */
async function getKnownNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transaction_shares")
    .select("person_name")
    .not("person_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const name = row.person_name?.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    if (names.length >= MAX_KNOWN_NAMES) break;
  }
  return names;
}

export default async function SwipenPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const period = currentPeriod(profile.salary_day, amsterdamToday());

  const [categories, transactions, totalOpen, openShares, knownNames] = await Promise.all([
    getActiveCategories(period),
    getOpenTransactions(),
    countOpenTransactions(),
    getOpenShares(),
    getKnownNames(),
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
      knownNames={knownNames}
      coachStep={profile.coach_step}
    />
  );
}

