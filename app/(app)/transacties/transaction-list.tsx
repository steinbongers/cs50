"use client";

import { useState } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Card } from "@/components/ui/card";
import { formatLongDay, formatSignedEuro } from "@/lib/format";
import type { DayGroup, SearchResult } from "@/lib/transactions/search";
import { cn } from "@/lib/utils";
import { TransactionSheet } from "./transaction-sheet";

export interface ListCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Ingebouwd potje (Voorgeschoten): daar verplaats je niets naartoe of vandaan. */
  isSystem: boolean;
  archived: boolean;
}

interface TransactionListProps {
  groups: DayGroup<SearchResult>[];
  categories: ListCategory[];
}

/** Resultaten per dag; tik op een rij voor de details, je notitie en verplaatsen. */
export function TransactionList({ groups, categories }: TransactionListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = new Map(categories.map((c) => [c.id, c]));
  // Na verversen (notitie, ander potje) altijd de verse rij tonen; is hij weggefilterd, dan sluit de sheet.
  const open = openId === null ? null : (groups.flatMap((g) => g.rows).find((r) => r.id === openId) ?? null);

  return (
    <>
      {groups.map((group) => {
        const headingId = `dag-${group.date}`;
        return (
          <section key={group.date} aria-labelledby={headingId}>
            <h2 id={headingId} className="px-4 pt-4 pb-1.5 text-[13px] font-medium text-text-muted">
              {formatLongDay(group.date)}
            </h2>
            <div className="px-4">
              <Card padding="none">
                <ul className="divide-y">
                  {group.rows.map((tx) => {
                    const category = tx.categoryId ? byId.get(tx.categoryId) : undefined;
                    const sub = tx.note ?? tx.description;
                    const where = category ? category.name : "Nog op de stapel";
                    return (
                      <li key={tx.id}>
                        <button
                          type="button"
                          onClick={() => setOpenId(tx.id)}
                          aria-label={`${tx.counterparty}, ${formatSignedEuro(tx.amount)}, ${where}`}
                          className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
                        >
                          {category ? (
                            <CategoryBadge icon={category.icon} color={category.color} size="sm" />
                          ) : (
                            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center">
                              <span className="size-2.5 rounded-full bg-text-muted/50" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-[15px] font-medium break-all">{tx.counterparty}</span>
                            {(sub || !category) && (
                              <span className="line-clamp-1 text-[13px] text-text-muted break-all">
                                {category ? sub : sub ? `Nog op de stapel · ${sub}` : "Nog op de stapel"}
                              </span>
                            )}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums",
                              tx.amount > 0 && "text-positive",
                            )}
                          >
                            {formatSignedEuro(tx.amount)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </section>
        );
      })}

      <TransactionSheet transaction={open} categories={categories} onClose={() => setOpenId(null)} />
    </>
  );
}
