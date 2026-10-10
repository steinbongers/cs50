import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Card } from "@/components/ui/card";
import { categoryColorClasses } from "@/lib/categories/palette";
import { goalLabel, goalStatus } from "@/lib/insights/budget";
import type { CatLite } from "@/lib/insights/compute";
import { cn } from "@/lib/utils";
import { SAVINGS_SINCE, savingsStandText, signedWhole } from "./overview-copy";

export interface SavingsItem {
  cat: CatLite;
  /** Stand: alles erin min alles eruit, sinds het eerste kaartje in de app. */
  stand: number;
  /** Netto erin (positief) of eruit (negatief) in de getoonde maand. */
  month: number;
}

/**
 * Blok "Sparen" onder de potjes: per spaarpotje de stand, wat er deze maand bij kwam of af
 * ging en (met een doel) een dunne balk naar het doel. Neutraal: geen groen of amber, ook niet
 * als er geld uit ging. Er is nog geen startsaldo, dus de stand begint bij je eerste kaartje.
 */
export function SavingsSection({ items, when }: { items: SavingsItem[]; when: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="sparen" className="flex flex-col gap-2">
      <h2 id="sparen" className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-[17px] leading-[22px] font-semibold">Sparen</span>
        <span className="text-[13px] leading-[18px] text-text-muted">{SAVINGS_SINCE}</span>
      </h2>
      <Card padding="none">
        <ul className="divide-y">
          {items.map(({ cat, stand, month }) => {
            const goal = cat.goalAmount !== null && cat.goalAmount > 0 ? goalStatus(Math.max(0, stand), cat.goalAmount) : null;
            const change = signedWhole(month);
            return (
              <li key={cat.id}>
                <Link
                  href={`/potjes/${cat.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
                >
                  <CategoryBadge icon={cat.icon} color={cat.color} size="row" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{cat.name}</span>
                    <span className="block text-[13px] leading-[18px] text-text-muted tabular-nums">{savingsStandText(stand)}</span>
                    {goal && (
                      <>
                        <BudgetBar ratio={goal.ratio} colorClass={categoryColorClasses(cat.color).solid} className="mt-1.5" />
                        <span
                          className={cn(
                            "mt-1 block text-[13px] leading-[18px] tabular-nums",
                            goal.reached ? "text-positive" : "text-text-muted",
                          )}
                        >
                          {goalLabel(goal)}
                        </span>
                      </>
                    )}
                  </span>
                  {change && (
                    <span className="shrink-0 self-start pt-0.5 text-right">
                      <span className="block text-[15px] font-semibold whitespace-nowrap tabular-nums">{change}</span>
                      <span className="block text-[13px] leading-[18px] text-text-muted">{when}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
