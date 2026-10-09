import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { incomeCompareText, netLine } from "@/components/insights/insight-copy";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Card } from "@/components/ui/card";
import { IconChevronRight } from "@/components/ui/icons";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatDay, formatEuro, formatEuroWhole, formatSignedEuro } from "@/lib/format";
import type { IncomeComparison } from "@/lib/insights/charts";
import type { CatLite, TxLite } from "@/lib/insights/compute";
import { cn } from "@/lib/utils";

export interface IncomeGroup {
  cat: CatLite;
  amount: number;
  txs: TxLite[];
}

interface IncomeViewProps {
  monthName: string;
  isCurrent: boolean;
  total: number;
  spent: number;
  comparison: IncomeComparison;
  groups: IncomeGroup[];
  /** Inkomend geld dat nog in geen potje zit. */
  unsorted: number;
  /** Heeft de gebruiker een inkomstenpotje? */
  hasIncomePotje: boolean;
}

/**
 * Inkomsten van de getoonde maand: het totaal, één neutrale regel tegenover je
 * gemiddelde, per inkomstenpotje een balk en daaronder de kaartjes per potje.
 * Geld terug en Voorgeschoten tellen nooit als inkomen (zie `incomeOf`).
 */
export function IncomeView({ monthName, isCurrent, total, spent, comparison, groups, unsorted, hasIncomePotje }: IncomeViewProps) {
  if (total <= 0 && groups.length === 0) {
    return (
      <>
        <Card padding="lg" className="text-center">
          <p className="text-[15px] text-text-muted">
            {!hasIncomePotje
              ? "Je hebt nog geen inkomstenpotje. Maak er een, dan zie je hier wat er binnenkomt."
              : isCurrent
                ? "Deze maand kwam er nog niets binnen in een inkomstenpotje."
                : `In ${monthName} kwam er niets binnen in een inkomstenpotje.`}
          </p>
          {!hasIncomePotje && (
            <Link href="/potjes/beheren" className="mt-3 inline-flex min-h-11 items-center text-[15px] font-medium text-primary">
              Potjes beheren
            </Link>
          )}
        </Card>
        {unsorted > 0 && <UnsortedNote amount={unsorted} />}
      </>
    );
  }

  const compare = incomeCompareText(comparison, isCurrent);
  const max = Math.max(...groups.map((g) => g.amount), 0);

  return (
    <>
      <section aria-label={`Inkomsten in ${monthName}`} className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="text-[13px] text-text-muted">Binnengekomen</p>
          <p className="text-[30px] leading-9 font-semibold tracking-[-0.02em]">{formatEuroWhole(total)}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          {comparison.average !== null ? (
            <p className="mx-auto inline-flex min-h-7 items-center rounded-[14px] bg-surface-muted px-3 py-1 text-[13px] leading-[18px] font-medium">
              {compare.text}
            </p>
          ) : (
            <p className="text-[13px] text-text-muted">{compare.text}</p>
          )}
          {compare.basis && <p className="text-[13px] leading-[18px] text-text-muted">{compare.basis}</p>}
        </div>
        <p className="text-[15px] tabular-nums">{netLine(total - spent)}</p>
        {unsorted > 0 && <UnsortedNote amount={unsorted} />}
      </section>

      {groups.length > 0 && (
        <Card padding="none">
          <ul className="divide-y">
            {groups.map(({ cat, amount }) => (
              <li key={cat.id}>
                <Link
                  href={`/potjes/${cat.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
                >
                  <CategoryBadge icon={cat.icon} color={cat.color} size="row" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{cat.name}</span>
                    {/* Eén potje vergelijkt met niets: dan geen balk. */}
                    {groups.length > 1 && max > 0 && (
                      <BudgetBar ratio={amount / max} colorClass={categoryColorClasses(cat.color).solid} className="mt-1.5" />
                    )}
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatEuroWhole(amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {groups.map(({ cat, amount, txs }) =>
        txs.length === 0 ? null : (
          <section key={cat.id} aria-labelledby={`ink-${cat.id}`}>
            <h2 id={`ink-${cat.id}`} className="mb-2 flex justify-between px-1 text-[13px] leading-[18px] text-text-muted">
              <span className="truncate">{cat.name}</span>
              <span className="shrink-0 tabular-nums">{formatEuro(amount)}</span>
            </h2>
            <Card padding="none">
              <ul className="divide-y">
                {txs.map((tx) => (
                  <li key={tx.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{tx.counterparty || "Onbekende tegenpartij"}</span>
                      <span className="block text-[13px] leading-[18px] text-text-muted">{formatDay(tx.bookingDate)}</span>
                    </span>
                    <span className={cn("shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums", tx.amount > 0 && "text-positive")}>
                      {formatSignedEuro(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ),
      )}
    </>
  );
}

function UnsortedNote({ amount }: { amount: number }) {
  return (
    <Link
      href="/swipen"
      className="-my-1 flex min-h-11 items-center gap-1 self-center rounded-control px-2 text-[13px] leading-[18px] text-text-muted transition-colors duration-150 hover:bg-surface-muted"
    >
      {formatEuroWhole(amount)} binnengekomen zit nog in geen potje
      <IconChevronRight size={16} className="shrink-0" />
    </Link>
  );
}
