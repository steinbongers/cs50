"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CategoryEditor } from "@/components/categories/category-editor";
import { CategoryBadge } from "@/components/categories/category-badge";
import type { CategoryPickerGridItem } from "@/components/categories/category-picker-grid";
import { BudgetBar } from "@/components/ui/budget-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconChevronLeft, IconPencil } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { isSavingsPot } from "@/lib/categories/display";
import { categoryColorClasses } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { formatDay, formatDayShort, formatEuro, formatEuroWhole, formatSignedEuro } from "@/lib/format";
import { budgetLabel, budgetStatus, goalLabel, goalStatus } from "@/lib/insights/budget";
import type { WeekPoint } from "@/lib/insights/compute";
import { cn } from "@/lib/utils";
import { archiveCategory, moveTransaction, updateCategory } from "../actions";
import { GoalRing } from "./goal-ring";
import { GoalSheet } from "./goal-sheet";
import { TransactionSheet } from "./transaction-sheet";

/**
 * Wat er onder de datum staat: bij een terugbetaling waar hij bij hoort, bij een deel van welke
 * afschrijving, bij een uitgave of hij nog op geld terug wacht en wat er al terug is, anders (oude
 * verdeling) jouw deel.
 */
function refundNote(tx: DetailTransaction): string {
  if (tx.refundFor) return ` · Terug voor: ${tx.refundFor}`;
  if (tx.splitOf) return ` · ${tx.splitOf}`;
  const received = tx.refundReceived ?? 0;
  if (tx.awaitingRefund) {
    return received > 0
      ? ` · Wacht op geld terug, ${formatEuro(received)} van ${formatEuro(Math.abs(tx.amount))} terug`
      : " · Wacht op geld terug";
  }
  if (received > 0) {
    // Afgerond. Met een eigen schatting is own_share schatting plus wat via de bank terugkwam.
    const own = Math.max(0, (tx.ownShare ?? Math.abs(tx.amount)) - received);
    return ` · ${formatEuro(received)} terug, jouw deel ${formatEuro(own)}`;
  }
  if (tx.ownShare !== null) return ` · jouw deel van ${formatEuro(Math.abs(tx.amount))}`;
  return "";
}

/**
 * Bedrag op de rij. Met gekoppelde terugbetalingen de uitgave zoals de bank hem afschreef (de
 * terugbetalingen staan als eigen regel); anders jouw deel als dat er is.
 */
function rowAmount(tx: DetailTransaction): number {
  if ((tx.refundReceived ?? 0) > 0) return tx.amount;
  return tx.ownShare !== null ? -tx.ownShare : tx.amount;
}

export interface DetailTransaction {
  id: string;
  bookingDate: string;
  amount: number;
  ownShare: number | null;
  /** Opgeschoonde tegenpartij (lijst en sheettitel). */
  counterparty: string;
  /** Tegenpartij en omschrijving zoals de bank ze stuurde (voor de sheet). */
  rawCounterparty: string;
  rawDescription: string | null;
  bookingTime: string | null;
  note: string | null;
  /** Contante uitgave of deel: de korte notitie van het verdelen (staat in de omschrijving), anders null. */
  cashNote?: string | null;
  /** Deel van een verdeelde afschrijving: "Deel van ICS Creditcard (€ 450,00)", anders null. */
  splitOf?: string | null;
  /** Uitgave die nog op geld terug wacht. */
  awaitingRefund?: boolean;
  /** Al terug voor deze uitgave via gekoppelde terugbetalingen (positief). */
  refundReceived?: number;
  /** Terugbetaling: de tegenpartij van de uitgave waar hij bij hoort, anders null. */
  refundFor?: string | null;
  inPeriod: boolean;
}

interface PotjeDetailProps {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    isIncome: boolean;
    monthlyBudget: number | null;
    goalAmount: number | null;
  };
  /** Uitgegeven (of bij Inkomen: binnengekomen) deze maand. */
  spent: number;
  /** Alles wat ooit in dit potje is gestopt; alleen gevuld bij een spaardoel. */
  saved: number | null;
  periodLabel: string;
  series: WeekPoint[];
  transactions: DetailTransaction[];
  /** Alle actieve gewone potjes, inclusief dit potje (voor "Naar ander potje"). */
  pickableCategories: CategoryPickerGridItem[];
}

export function PotjeDetail({
  category,
  spent,
  saved,
  periodLabel,
  series,
  transactions,
  pickableCategories,
}: PotjeDetailProps) {
  const [openTx, setOpenTx] = useState<DetailTransaction | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<CategoryDraft | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [notes, setNotes] = useState<Map<string, string | null>>(() => new Map());
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const colors = categoryColorClasses(category.color);
  const budget = category.monthlyBudget;
  const goal = category.goalAmount;
  const canTrack = !category.isIncome;
  const monthLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
  // Inkomen komt binnen, een spaarpotje vul je, een gewoon potje geef je uit.
  const amountLabel = category.isIncome
    ? "Binnengekomen"
    : isSavingsPot(category)
      ? "Deze maand erin"
      : "Uitgegeven deze maand";

  const budgetState = canTrack && budget !== null && budget > 0 ? budgetStatus(spent, budget) : null;
  const goalState = canTrack && budgetState === null && goal !== null && goal > 0 ? goalStatus(saved ?? 0, goal) : null;

  const maxWeek = Math.max(...series.map((p) => p.spent), 1);
  const topWeek = series.reduce<WeekPoint | null>((best, p) => (p.spent > 0 && (!best || p.spent > best.spent) ? p : best), null);
  const chartLabel = topWeek
    ? `Uitgaven per week, laatste ${series.length} weken. Meeste in de week van ${formatDayShort(topWeek.weekStart)}: ${formatEuroWhole(topWeek.spent)}.`
    : `Uitgaven per week, laatste ${series.length} weken`;

  const withNotes = transactions.map((t) => (notes.has(t.id) ? { ...t, note: notes.get(t.id) ?? null } : t));
  const remaining = withNotes.filter((t) => !hiddenIds.has(t.id));
  const visible = remaining.filter((t) => showAll || t.inPeriod);
  const olderCount = remaining.filter((t) => !t.inPeriod).length;

  function move(tx: DetailTransaction, targetId: string) {
    setOpenTx(null);
    setHiddenIds((prev) => new Set([...prev, tx.id]));
    startTransition(async () => {
      const result = await moveTransaction(tx.id, targetId);
      if (!result.ok) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(tx.id);
          return next;
        });
        setError(result.error);
      } else setError(null);
    });
  }

  function noteSaved(transactionId: string, note: string | null) {
    setNotes((prev) => new Map(prev).set(transactionId, note));
    setOpenTx((current) => (current && current.id === transactionId ? { ...current, note } : current));
  }

  function saveEdit() {
    if (!editDraft) return;
    const draft = editDraft;
    startTransition(async () => {
      const result = await updateCategory(category.id, { name: draft.name, icon: draft.icon, color: draft.color, isIncome: draft.isIncome });
      if (!result.ok) setError(result.error);
      else setEditDraft(null);
    });
  }

  function archive() {
    startTransition(async () => {
      const result = await archiveCategory(category.id);
      if (result && !result.ok) {
        setArchiveOpen(false);
        setError(result.error);
      }
    });
  }

  return (
    <>
      <header className="safe-top-2 flex min-h-11 items-center gap-3 px-4 pb-4">
        <Link
          href="/overzicht"
          aria-label="Terug"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text hover:bg-surface-muted"
        >
          <IconChevronLeft />
        </Link>
        <CategoryBadge icon={category.icon} color={category.color} size="row" />
        <h1 className="line-clamp-2 min-w-0 flex-1 text-[22px] leading-7 font-semibold tracking-[-0.01em] break-words">{category.name}</h1>
        <button
          type="button"
          onClick={() =>
            setEditDraft({ name: category.name, icon: category.icon, color: category.color, isIncome: category.isIncome, enabled: true })
          }
          aria-label="Potje bewerken"
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
        >
          <IconPencil size={20} />
        </button>
      </header>

      <div className="flex flex-col gap-6 px-4 pb-6">
        <Card className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] leading-[18px] text-text-muted">
              {amountLabel} · {monthLabel}
            </p>
            <p className="text-[28px] leading-[34px] font-semibold tabular-nums tracking-[-0.02em]">{formatEuroWhole(spent)}</p>
          </div>

          {budgetState && budget !== null && (
            <div className="flex flex-col gap-1.5">
              <BudgetBar ratio={budgetState.ratio} over={budgetState.state === "over"} colorClass={colors.solid} />
              <div className="flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "text-[13px] leading-[18px] tabular-nums",
                    budgetState.state === "over" ? "font-medium text-accent-strong" : "text-text-muted",
                  )}
                >
                  {budgetState.state === "over"
                    ? budgetLabel(budgetState)
                    : `${budgetLabel(budgetState)} van ${formatEuroWhole(budget)}`}
                </p>
                <button
                  type="button"
                  onClick={() => setGoalOpen(true)}
                  className="-mr-2 min-h-11 shrink-0 px-2 text-[15px] font-medium text-primary"
                >
                  Aanpassen
                </button>
              </div>
            </div>
          )}

          {goalState && (
            <div className="flex items-center gap-4">
              <GoalRing ratio={goalState.ratio} colorClass={colors.text} />
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <p className="text-[13px] leading-[18px] text-text-muted">Spaardoel</p>
                <p
                  className={cn(
                    "text-[15px] leading-5 font-medium tabular-nums",
                    goalState.reached ? "text-positive" : "text-text",
                  )}
                >
                  {goalLabel(goalState)}
                </p>
                <button
                  type="button"
                  onClick={() => setGoalOpen(true)}
                  className="-ml-2 min-h-11 px-2 text-[15px] font-medium text-primary"
                >
                  Aanpassen
                </button>
              </div>
            </div>
          )}

          {canTrack && !budgetState && !goalState && (
            <button
              type="button"
              onClick={() => setGoalOpen(true)}
              className="-ml-2 min-h-11 self-start px-2 text-[15px] font-medium text-primary"
            >
              Budget of spaardoel instellen
            </button>
          )}
        </Card>

        {series.some((p) => p.spent > 0) && (
          <Card className="flex flex-col gap-2">
            <p className="text-[13px] leading-[18px] text-text-muted">Per week</p>
            <div className="flex items-end gap-1.5" role="img" aria-label={chartLabel}>
              {series.map((point, index) => {
                const current = index === series.length - 1;
                return (
                  <div key={point.weekStart} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-16 w-full items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-[4px]",
                          point.spent > 0 ? colors.solid : "bg-surface-muted",
                          point.spent > 0 && !current && "opacity-40",
                        )}
                        style={{ height: `${point.spent > 0 ? Math.max(6, (point.spent / maxWeek) * 100) : 4}%` }}
                      />
                    </div>
                    <span className={cn("text-[10px] leading-3 tabular-nums", current ? "text-text" : "text-text-muted")} aria-hidden>
                      {formatDayShort(point.weekStart)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {error && (
          <p className="rounded-control bg-negative-soft px-4 py-3 text-[15px] text-negative" role="alert">
            {error}
          </p>
        )}

        <Card padding="none">
          <div className="flex min-h-11 items-center justify-between px-4 pt-1">
            <h2 className="text-[13px] leading-[18px] font-medium text-text-muted">Kaartjes</h2>
            {olderCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((s) => !s)}
                aria-expanded={showAll}
                className="-mr-2 min-h-11 px-2 text-[15px] font-medium text-primary"
              >
                {showAll ? "Alleen deze maand" : `Eerdere tonen (${olderCount})`}
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p className="border-t px-4 py-6 text-center text-[15px] text-text-muted">Deze maand nog niets in dit potje.</p>
          ) : (
            <ul className="divide-y border-t">
              {visible.map((tx) => (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => setOpenTx(tx)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-muted"
                    aria-label={`${tx.counterparty}, ${formatDay(tx.bookingDate)}, ${formatSignedEuro(rowAmount(tx))}${tx.note ? `, notitie: ${tx.note}` : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] leading-5 font-medium">{tx.counterparty}</p>
                      {(tx.note ?? tx.cashNote) && (
                        <p className="truncate text-[13px] leading-[18px] text-text">{tx.note ?? tx.cashNote}</p>
                      )}
                      <p className="truncate text-[13px] leading-[18px] text-text-muted">
                        {formatDay(tx.bookingDate)}
                        {refundNote(tx)}
                      </p>
                    </div>
                    <p className={cn("text-[15px] font-semibold tabular-nums", tx.amount > 0 && "text-positive")}>
                      {formatSignedEuro(rowAmount(tx))}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <TransactionSheet
        transaction={openTx}
        currentCategoryId={category.id}
        categories={pickableCategories}
        onClose={() => setOpenTx(null)}
        onMove={move}
        onNoteSaved={noteSaved}
      />

      {canTrack && (
        <GoalSheet
          open={goalOpen}
          onClose={() => setGoalOpen(false)}
          categoryId={category.id}
          monthlyBudget={budget}
          goalAmount={goal}
        />
      )}

      <Sheet open={editDraft !== null} onClose={() => setEditDraft(null)} title="Potje bewerken">
        {editDraft && (
          <div className="flex flex-col gap-4">
            <CategoryEditor
              draft={editDraft}
              onChange={(patch) => setEditDraft((d) => (d ? { ...d, ...patch } : d))}
              onDone={saveEdit}
              doneLabel="Opslaan"
              pending={isPending}
            />
            <Button
              variant="danger"
              onClick={() => {
                setEditDraft(null);
                setArchiveOpen(true);
              }}
            >
              Potje archiveren
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={`‘${category.name}’ archiveren?`}
        description="Je kaartjes blijven bewaard. Terugzetten kan via Potjes beheren."
      >
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setArchiveOpen(false)}>
            Toch niet
          </Button>
          <Button variant="danger" fullWidth onClick={archive} loading={isPending}>
            Archiveren
          </Button>
        </div>
      </Sheet>
    </>
  );
}
