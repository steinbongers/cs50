import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { IconChevronRight } from "@/components/ui/icons";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";
import { budgetLabel, budgetStatus } from "@/lib/insights/budget";
import type { CatLite } from "@/lib/insights/compute";
import { cn } from "@/lib/utils";
import { PotjeProgress } from "./potje-progress";

/** Het potje waar je deze maand op let (gekozen bij de maandafsluiting), met de stand. */
export function FocusCard({ category, amount, lastMonth }: { category: CatLite; amount: number; lastMonth: number }) {
  const colors = categoryColorClasses(category.color);
  const budget = category.monthlyBudget !== null && category.monthlyBudget > 0 ? budgetStatus(amount, category.monthlyBudget) : null;
  const detail = budget ? budgetLabel(budget) : lastMonth > 0 ? `Vorige maand ${formatEuroWhole(lastMonth)}` : null;

  return (
    <Link
      href={`/potjes/${category.id}`}
      className={cn("flex min-h-14 items-center gap-3 rounded-card px-4 py-3 transition-transform duration-100 active:scale-[0.98] motion-reduce:transition-none", colors.bg)}
    >
      <CategoryBadge icon={category.icon} color={category.color} size="row" className="bg-surface" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">Je let deze maand op {category.name}</span>
        <PotjeProgress
          amount={amount}
          budget={budget ? category.monthlyBudget : null}
          lastMonth={lastMonth}
          over={budget?.state === "over"}
          colorClass={colors.solid}
          className="mt-1.5"
        />
        {detail && (
          <span
            aria-hidden={!budget}
            className={cn("mt-1 block text-[13px] leading-[18px] tabular-nums", budget?.state === "over" ? "text-accent-strong" : "text-text-muted")}
          >
            {detail}
          </span>
        )}
      </span>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatEuroWhole(amount)}</span>
      <IconChevronRight size={18} className="-mr-1 shrink-0 text-text-muted" />
    </Link>
  );
}
