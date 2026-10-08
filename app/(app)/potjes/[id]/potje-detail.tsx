"use client";

import { useState, useTransition } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { CategoryEditor } from "@/components/categories/category-editor";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconPencil } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { categoryColorClasses } from "@/lib/categories/palette";
import type { CategoryDraft } from "@/lib/categories/types";
import { formatDay, formatDayShort, formatEuro, formatEuroWhole, formatSignedEuro } from "@/lib/format";
import type { WeekPoint } from "@/lib/insights/compute";
import { cn } from "@/lib/utils";
import { archiveCategory, moveTransaction, setBudget, updateCategory } from "../actions";

export interface DetailTransaction {
  id: string;
  bookingDate: string;
  amount: number;
  ownShare: number | null;
  counterparty: string;
  description: string | null;
  inPeriod: boolean;
}

interface PotjeDetailProps {
  category: { id: string; name: string; icon: string; color: string; isIncome: boolean; monthlyBudget: number | null };
  spent: number;
  periodLabel: string;
  series: WeekPoint[];
  transactions: DetailTransaction[];
  otherCategories: Array<{ id: string; name: string; icon: string; color: string }>;
}

export function PotjeDetail({ category, spent, periodLabel, series, transactions, otherCategories }: PotjeDetailProps) {
  const [moving, setMoving] = useState<DetailTransaction | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetValue, setBudgetValue] = useState(category.monthlyBudget === null ? "" : String(category.monthlyBudget));
  const [editDraft, setEditDraft] = useState<CategoryDraft | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const colors = categoryColorClasses(category.color);
  const budget = category.monthlyBudget;
  const overBudget = budget !== null && spent > budget;
  const label = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
  const maxWeek = Math.max(...series.map((p) => p.spent), 1);
  const topWeek = series.reduce<WeekPoint | null>((best, p) => (p.spent > 0 && (!best || p.spent > best.spent) ? p : best), null);
  const chartLabel = topWeek
    ? `Uitgaven per week, laatste acht weken. Meeste in de week van ${formatDayShort(topWeek.weekStart)}: ${formatEuro(topWeek.spent)}.`
    : "Uitgaven per week, laatste acht weken";
  const visible = transactions.filter((t) => !hiddenIds.has(t.id) && (showAll || t.inPeriod));
  const olderCount = transactions.filter((t) => !t.inPeriod).length;

  function move(target: { id: string }) {
    if (!moving) return;
    const tx = moving;
    setMoving(null);
    setHiddenIds((prev) => new Set([...prev, tx.id]));
    startTransition(async () => {
      const result = await moveTransaction(tx.id, target.id);
      if (!result.ok) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(tx.id);
          return next;
        });
        setError(result.error);
      }
    });
  }

  function saveBudget() {
    const trimmed = budgetValue.trim().replace(",", ".");
    const value = trimmed === "" ? null : Number(trimmed);
    if (value !== null && !Number.isFinite(value)) {
      setError("Vul een bedrag in, bijvoorbeeld 150.");
      return;
    }
    startTransition(async () => {
      const result = await setBudget(category.id, value);
      if (!result.ok) setError(result.error);
      else setBudgetOpen(false);
    });
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
    setArchiveOpen(false);
    startTransition(async () => {
      const result = await archiveCategory(category.id);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      <Card padding="lg" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <CategoryBadge icon={category.icon} color={category.color} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-muted">{category.isIncome ? "Binnengekomen" : "Uitgegeven"} · {label}</p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatEuroWhole(spent)}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setEditDraft({ name: category.name, icon: category.icon, color: category.color, isIncome: category.isIncome, enabled: true })
            }
            aria-label="Potje bewerken"
            className="flex size-11 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <IconPencil size={20} />
          </button>
        </div>

        {!category.isIncome && (
          <div className="flex flex-col gap-1.5">
            {budget !== null ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className={overBudget ? "text-accent" : "text-text-muted"}>
                    {overBudget ? `${formatEuro(spent - budget)} over je budget` : `${formatEuro(budget - spent)} over van ${formatEuroWhole(budget)}`}
                  </span>
                  <button type="button" onClick={() => setBudgetOpen(true)} className="-mr-2 min-h-11 px-2 font-medium text-primary">
                    Aanpassen
                  </button>
                </div>
                <ProgressBar value={Math.min(spent, budget)} max={budget} label="Budget" tone={overBudget ? "accent" : "primary"} />
              </>
            ) : (
              <button type="button" onClick={() => setBudgetOpen(true)} className="min-h-11 self-start text-sm font-medium text-primary">
                Budget instellen
              </button>
            )}
          </div>
        )}
      </Card>

      {series.some((p) => p.spent > 0) && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-text-muted">Per week</p>
          <div className="flex items-end gap-1.5" role="img" aria-label={chartLabel}>
            {series.map((point) => (
              <div key={point.weekStart} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end">
                  <div
                    className={cn("w-full rounded-t-md", point.spent > 0 ? colors.solid : "bg-surface-muted")}
                    style={{ height: `${point.spent > 0 ? Math.max(6, (point.spent / maxWeek) * 100) : 4}%` }}
                    title={`${formatEuro(point.spent)} in de week van ${formatDay(point.weekStart)}`}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-text-muted">{formatDayShort(point.weekStart)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {error && (
        <p className="rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
          {error}
        </p>
      )}

      <Card padding="none">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-text-muted">Transacties</p>
          {olderCount > 0 && (
            <button type="button" onClick={() => setShowAll((s) => !s)} className="-mr-2 min-h-11 px-2 text-sm font-medium text-primary">
              {showAll ? "Alleen deze periode" : `Ook eerder (${olderCount})`}
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <p className="border-t px-4 py-6 text-center text-sm text-text-muted">Nog niets in dit potje deze periode.</p>
        ) : (
          <ul className="divide-y border-t">
            {visible.map((tx) => (
              <li key={tx.id}>
                <button
                  type="button"
                  onClick={() => setMoving(tx)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-muted"
                  aria-label={`${tx.counterparty}, ${formatSignedEuro(tx.amount)}, verplaatsen`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.counterparty}</p>
                    <p className="truncate text-xs text-text-muted">
                      {formatDay(tx.bookingDate)}
                      {tx.ownShare !== null && ` · jouw deel van ${formatEuro(Math.abs(tx.amount))}`}
                    </p>
                  </div>
                  <p className={cn("text-sm font-semibold tabular-nums", tx.amount > 0 && "text-positive")}>
                    {tx.ownShare !== null ? formatSignedEuro(-tx.ownShare) : formatSignedEuro(tx.amount)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={moving !== null} onClose={() => setMoving(null)} title="Verplaatsen naar" description={moving ? `${moving.counterparty} · ${formatSignedEuro(moving.amount)}` : undefined}>
        <ul className="grid grid-cols-3 gap-2" role="list">
          {otherCategories.map((other) => {
            const c = categoryColorClasses(other.color);
            return (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => move(other)}
                  aria-label={`${other.name} kiezen`}
                  className="flex h-24 w-full flex-col items-center justify-start gap-1 rounded-card bg-surface px-1.5 pt-3 shadow-card hover:bg-surface-muted"
                >
                  <span className={cn("flex size-9 items-center justify-center rounded-full", c.bg, c.text)} aria-hidden>
                    <CategoryIcon icon={other.icon} size={18} />
                  </span>
                  <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight">{other.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>

      <Sheet open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Maandbudget" description="Hoeveel wil je per maand in dit potje stoppen? Laat leeg om geen budget te hebben.">
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            inputMode="decimal"
            aria-label="Budget in euro"
            placeholder="Bijvoorbeeld 150"
            value={budgetValue}
            onChange={(e) => setBudgetValue(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            {budget !== null && (
              <Button variant="ghost" onClick={() => { setBudgetValue(""); startTransition(async () => { await setBudget(category.id, null); setBudgetOpen(false); }); }}>
                Weghalen
              </Button>
            )}
            <Button fullWidth onClick={saveBudget} loading={isPending}>
              Opslaan
            </Button>
          </div>
        </div>
      </Sheet>

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
        title={`Potje "${category.name}" archiveren?`}
        description="De transacties blijven bewaard. Je kunt het potje later terugzetten via Potjes beheren."
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
    </div>
  );
}
