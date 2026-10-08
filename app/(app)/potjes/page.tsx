import type { Metadata } from "next";
import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronRight, IconJar } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ensureProfile, requireUser } from "@/lib/auth";
import { VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import { formatEuroWhole } from "@/lib/format";
import { currentPeriod } from "@/lib/periods";
import { getActiveCategories, getOpenShares } from "@/lib/transactions/queries";
import { SharesList } from "./shares-list";

export const metadata: Metadata = { title: "Potjes" };

export default async function PotjesPage() {
  const user = await requireUser();
  const profile = await ensureProfile(user);
  const period = currentPeriod(profile.salary_day);
  const [categories, openShares] = await Promise.all([getActiveCategories(period), getOpenShares()]);

  const potjes = categories.filter((c) => c.systemKey === null);
  const openTotal = openShares.reduce((a, s) => a + s.amount, 0);

  return (
    <>
      <PageHeader
        title="Potjes"
        subtitle={period.label.charAt(0).toUpperCase() + period.label.slice(1)}
        action={
          <Link href="/potjes/beheren" className="flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-primary hover:bg-primary-soft">
            Beheren
          </Link>
        }
      />
      <div className="flex flex-col gap-4 px-4">
        {potjes.length === 0 ? (
          <EmptyState icon={<IconJar size={28} />} title="Nog geen potjes" description="Kies je potjes in de onboarding." />
        ) : (
          <Card padding="none" className="divide-y">
            {potjes.map((category) => (
              <Link
                key={category.id}
                href={`/potjes/${category.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
              >
                <CategoryBadge icon={category.icon} color={category.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{category.name}</p>
                  {category.isIncome && <p className="text-xs text-text-muted">Inkomen</p>}
                </div>
                <p className="text-sm font-medium tabular-nums text-text-muted">
                  {category.spentThisPeriod === 0 ? "" : formatEuroWhole(category.spentThisPeriod)}
                </p>
                <IconChevronRight size={18} className="text-text-muted" />
              </Link>
            ))}
          </Card>
        )}

        <section aria-labelledby="voorgeschoten-title">
          <Card padding="none">
            <div className="flex items-center gap-3 px-4 py-3">
              <CategoryBadge icon={VOORGESCHOTEN_CATEGORY.icon} color={VOORGESCHOTEN_CATEGORY.color} />
              <div className="min-w-0 flex-1">
                <h2 id="voorgeschoten-title" className="font-medium">
                  {VOORGESCHOTEN_CATEGORY.name}
                </h2>
                <p className="text-xs text-text-muted">Geld dat anderen je nog terugbetalen</p>
              </div>
              {openTotal > 0 && <p className="text-sm font-medium tabular-nums">{formatEuroWhole(openTotal)} open</p>}
            </div>
            <div className="border-t">
              <SharesList shares={openShares} />
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
