"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { closeAwaitingRefund } from "@/app/(app)/overzicht/actions";
import { EstimateForm } from "@/components/refunds/estimate-form";
import { formatDayShort, formatEuro } from "@/lib/format";
import type { AwaitingRefund } from "@/lib/transactions/queries";
import { refundOutcome, refundProgressText } from "@/lib/transactions/refunds";
import { cn } from "@/lib/utils";

const smallButton =
  "inline-flex min-h-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 disabled:opacity-50";

interface AwaitingListProps {
  expenses: AwaitingRefund[];
  /** Na de laatste "Alles binnen" (na het korte succesbericht). */
  onAllClosed?: () => void;
}

/**
 * Uitgaven die nog op geld terug wachten, met wat er al terug is. "Alles binnen" vraagt eerst
 * hoe: de rest is van jou (met het bedrag erbij), of een deel kwam buiten de bank terug en
 * dan schat je zelf wat je uitgaf.
 */
export function AwaitingList({ expenses, onAllClosed }: AwaitingListProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState<{ id: string; estimating: boolean } | null>(null);
  const [closedAny, setClosedAny] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const doneCalled = useRef(false);

  const visible = expenses.filter((e) => !hidden.has(e.id));
  const allDone = visible.length === 0 && closedAny;

  useEffect(() => {
    if (!allDone || doneCalled.current || !onAllClosed) return;
    doneCalled.current = true;
    const timer = window.setTimeout(onAllClosed, 1600);
    return () => window.clearTimeout(timer);
  }, [allDone, onAllClosed]);

  if (visible.length === 0) {
    return closedAny ? (
      <p className="py-4 text-center text-[15px] font-medium" role="status">
        Alles binnen. Netjes.
      </p>
    ) : null;
  }

  function close(id: string, estimate: number | null = null) {
    setError(null);
    setConfirming(null);
    setClosedAny(true);
    setHidden((prev) => new Set([...prev, id]));
    startTransition(async () => {
      const result = await closeAwaitingRefund(id, estimate);
      if (!result.ok) {
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-[13px] text-text-muted" role="alert">
          {error}
        </p>
      )}
      <ul className="-mx-5 divide-y">
        {visible.map((expense) => {
          const own = refundOutcome(expense.amount, expense.received, 0).own;
          const asking = confirming?.id === expense.id;
          return (
            <li key={expense.id} className="flex flex-col gap-1 px-5 py-2.5">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {expense.categoryName} bij {expense.counterparty}
                </span>
              </div>
              <p className="text-[13px] leading-[18px] text-text-muted tabular-nums">
                {expense.bookingDate && `${formatDayShort(expense.bookingDate)} · `}
                {refundProgressText(expense.received, expense.amount)}
              </p>
              {asking && confirming.estimating ? (
                <div className="pt-1">
                  <EstimateForm
                    expenseAmount={expense.amount}
                    received={expense.received}
                    pending={isPending}
                    onSubmit={(estimate) => close(expense.id, estimate)}
                    onCancel={() => setConfirming({ id: expense.id, estimating: false })}
                  />
                </div>
              ) : asking ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-end gap-1">
                    <span className="min-w-0 flex-1 text-[13px] leading-[18px] tabular-nums">
                      Dan is {formatEuro(own)} van jou.
                    </span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setConfirming(null)}
                      className={cn(smallButton, "text-text-muted hover:bg-surface-muted")}
                    >
                      Nog niet
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => close(expense.id)}
                      className={cn(smallButton, "bg-accent-soft text-accent-strong hover:opacity-90")}
                    >
                      Ja, de rest is van mij
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirming({ id: expense.id, estimating: true })}
                    className={cn(smallButton, "self-end text-primary hover:bg-surface-muted")}
                  >
                    Een deel kwam buiten de bank terug
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirming({ id: expense.id, estimating: false })}
                    className={cn(smallButton, "bg-surface text-text shadow-card hover:bg-surface-muted")}
                  >
                    Alles binnen
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
