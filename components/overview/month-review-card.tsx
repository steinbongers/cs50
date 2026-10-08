"use client";

import { useState, useTransition } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEuro, formatEuroWhole, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markMonthReviewSeen } from "@/app/(app)/overzicht/actions";

export interface MonthReviewView {
  periodStartISO: string;
  periodEndISO: string;
  total: number;
  average: number | null;
  periodsUsed: number;
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    spent: number;
    average: number | null;
    budget: number | null;
  }>;
}

function headline(total: number, average: number | null): string {
  if (average === null) return "Je eerste volle maand zit erop.";
  const diff = total - average;
  if (Math.abs(diff) < 5) return "Precies je gemiddelde. Stabiel.";
  return diff < 0 ? `${formatEuro(-diff)} minder dan je gemiddelde. Netjes.` : `${formatEuro(diff)} meer dan je gemiddelde.`;
}

/** Jouw maand: verschijnt op de salarisdag bovenaan het overzicht tot hij bekeken is. */
export function MonthReviewCard({ review, currentPeriodStart }: { review: MonthReviewView; currentPeriodStart: string }) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  if (hidden) return null;

  const endInclusive = new Date(review.periodEndISO);
  endInclusive.setDate(endInclusive.getDate() - 1);
  const shown = review.categories.slice(0, 5);
  const more = review.categories.length - shown.length;

  function dismiss() {
    setHidden(true);
    startTransition(async () => {
      await markMonthReviewSeen(currentPeriodStart);
    });
  }

  return (
    <Card padding="lg" className="flex flex-col gap-4 border-2 border-primary-soft">
      <div>
        <p className="text-sm font-semibold text-primary">Jouw maand</p>
        <p className="text-xs text-text-muted">
          {formatLongDate(review.periodStartISO)} tot en met {formatLongDate(endInclusive)}
        </p>
      </div>
      <div>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatEuroWhole(review.total)}</p>
        <p className="text-sm text-text-muted">{headline(review.total, review.average)}</p>
      </div>

      {shown.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {shown.map((row) => {
            const overBudget = row.budget !== null && row.spent > row.budget;
            const pct = row.budget ? Math.min(100, (row.spent / row.budget) * 100) : null;
            return (
              <li key={row.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <CategoryBadge icon={row.icon} color={row.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                  <span className="text-sm font-medium tabular-nums">{formatEuroWhole(row.spent)}</span>
                  {row.average !== null && (
                    <span className={cn("w-16 text-right text-xs tabular-nums", row.spent <= row.average ? "text-positive" : "text-accent")}>
                      {row.spent <= row.average ? "\u2212 " : "+ "}
                      {formatEuroWhole(Math.abs(row.spent - row.average))}
                    </span>
                  )}
                </div>
                {pct !== null && (
                  <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                    <div className={cn("h-full rounded-full", overBudget ? "bg-accent" : "bg-primary")} style={{ width: `${pct}%` }} />
                  </div>
                )}
                {overBudget && <p className="ml-10 text-xs text-accent">{formatEuro(row.spent - row.budget!)} over je budget</p>}
              </li>
            );
          })}
          {more > 0 && <li className="text-xs text-text-muted">en {more} {more === 1 ? "potje" : "potjes"} meer</li>}
        </ul>
      )}

      <Button variant="secondary" onClick={dismiss}>
        Gezien
      </Button>
    </Card>
  );
}
