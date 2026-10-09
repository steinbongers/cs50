"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EstimateForm } from "@/components/refunds/estimate-form";
import { Sheet } from "@/components/ui/sheet";
import { formatDay, formatEuro } from "@/lib/format";
import type { AwaitingRefund, OpenShare } from "@/lib/transactions/queries";
import {
  nameMatches,
  orderRefundCandidates,
  refundMathText,
  refundOutcome,
  refundProgressText,
} from "@/lib/transactions/refunds";
import { cn } from "@/lib/utils";

export { nameMatches };

interface SettleSheetProps {
  open: boolean;
  onClose: () => void;
  shares: OpenShare[];
  /** Uitgaven die op geld terug wachten (bijhouden); staan bovenaan, één keuze. */
  awaiting?: AwaitingRefund[];
  incomingAmount: number;
  /** Tegenpartij van het binnengekomen geld, om delen met dezelfde naam bovenaan te zetten. */
  incomingCounterparty: string;
  /** Omschrijving van het binnengekomen geld (een Tikkie noemt vaak waarvoor). */
  incomingDescription?: string | null;
  pending?: boolean;
  onConfirm: (shareIds: string[]) => void;
  /**
   * Hoort bij deze uitgave; `complete` = alles binnen. Zonder `estimate` is de rest van jou;
   * met `estimate` kwam een deel buiten de bank terug en telt het potje precies dat bedrag.
   */
  onRefundFor?: (expenseId: string, complete: boolean, estimate?: number) => void;
}

/** Vanaf deze leeftijd tonen we hoe lang een deel al openstaat. */
const SHOW_AGE_FROM_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bij binnengekomen geld. Bovenaan de uitgaven die op geld terug wachten (één keuze, de meest
 * waarschijnlijke eerst); kies je er een, dan vraagt de sheet of alles binnen is. Daaronder,
 * zoals altijd, de open delen: tik aan welke hiermee betaald zijn. Delen met dezelfde naam als
 * de tegenpartij staan bovenaan, maar we vinken niets aan.
 */
export function SettleSheet({
  open,
  onClose,
  shares,
  awaiting = [],
  incomingAmount,
  incomingCounterparty,
  incomingDescription = null,
  pending = false,
  onConfirm,
  onRefundFor,
}: SettleSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expenseId, setExpenseId] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  // Eén peilmoment per sheet (de sheet krijgt per kaart een eigen key).
  const [now] = useState(() => Date.now());

  const ordered = shares
    .map((share, index) => ({ share, index, match: nameMatches(share.personName, incomingCounterparty) }))
    .sort((a, b) => Number(b.match) - Number(a.match) || a.index - b.index);

  const selectedTotal = Math.round(shares.filter((s) => selected.has(s.id)).reduce((a, s) => a + s.amount, 0) * 100) / 100;

  const candidates = orderRefundCandidates(awaiting, {
    counterparty: incomingCounterparty,
    description: incomingDescription,
  });
  const chosen = expenseId ? awaiting.find((a) => a.id === expenseId) : undefined;

  if (chosen && onRefundFor) {
    const outcome = refundOutcome(chosen.amount, chosen.received, incomingAmount);
    // Is alles al terug, dan staat afronden voorop; de gebruiker tikt nog steeds zelf.
    const yes = (
      <Button
        size="lg"
        fullWidth
        variant={outcome.complete ? "primary" : "secondary"}
        loading={pending}
        onClick={() => onRefundFor(chosen.id, true)}
      >
        Ja, de rest is van mij
      </Button>
    );
    const more = (
      <Button
        size="lg"
        fullWidth
        variant={outcome.complete ? "ghost" : "secondary"}
        disabled={pending}
        onClick={() => onRefundFor(chosen.id, false)}
      >
        Er komt nog meer
      </Button>
    );
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={`Is alles binnen voor ${chosen.categoryName} bij ${chosen.counterparty}?`}
        description={refundMathText(chosen.amount, chosen.received, incomingAmount)}
      >
        {estimating ? (
          <EstimateForm
            expenseAmount={chosen.amount}
            received={outcome.received}
            pending={pending}
            onSubmit={(estimate) => onRefundFor(chosen.id, true, estimate)}
            onCancel={() => setEstimating(false)}
          />
        ) : (
        <div className="flex flex-col gap-2">
          {outcome.complete && (
            <p className="pb-2 text-[13px] leading-[18px] text-text-muted">Er is genoeg terug om hem af te ronden.</p>
          )}
          {yes}
          {more}
          <button
            type="button"
            onClick={() => setEstimating(true)}
            className="h-11 self-center px-2 text-[15px] font-medium text-primary"
          >
            Een deel kwam buiten de bank terug
          </button>
          <button
            type="button"
            onClick={() => setExpenseId(null)}
            className="-mt-2 h-11 self-center px-2 text-[15px] font-medium text-text-muted"
          >
            Andere kiezen
          </button>
        </div>
        )}
      </Sheet>
    );
  }

  const withExpenses = candidates.length > 0 && onRefundFor !== undefined;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={withExpenses ? "Waar hoort dit geld bij?" : "Wie betaalt je terug?"}
      description={`${formatEuro(incomingAmount)} binnen. ${withExpenses ? "Kies waar het bij hoort." : "Tik aan van wie."}`}
    >
      <div className="flex flex-col gap-4">
        {withExpenses && (
          <section aria-labelledby="hoort-bij-uitgave" className="flex flex-col gap-1.5">
            <h3 id="hoort-bij-uitgave" className="text-[13px] leading-[18px] font-medium text-text-muted">
              Hoort bij een uitgave
            </h3>
            <ul className="flex flex-col gap-1.5">
              {candidates.map((expense) => (
                <li key={expense.id}>
                  <button
                    type="button"
                    onClick={() => setExpenseId(expense.id)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-control border bg-surface px-3 py-2 text-left transition-colors duration-150 active:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] leading-5 font-medium">
                        {expense.categoryName} bij {expense.counterparty}
                      </span>
                      <span className="block truncate text-[13px] leading-[18px] text-text-muted tabular-nums">
                        {expense.bookingDate && `${formatDay(expense.bookingDate)} · `}
                        {refundProgressText(expense.received, expense.amount)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shares.length > 0 && (
        <>
        {withExpenses && (
          <h3 className="-mb-2.5 text-[13px] leading-[18px] font-medium text-text-muted">Of bij open delen</h3>
        )}
        <ul className="flex flex-col gap-1.5">
          {ordered.map(({ share }) => {
            const checked = selected.has(share.id);
            const created = Date.parse(share.createdAt);
            const ageDays = Number.isFinite(created) ? Math.floor((now - created) / DAY_MS) : 0;
            return (
              <li key={share.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(share.id)}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors duration-150",
                    checked ? "border-primary bg-primary-soft" : "bg-surface active:bg-surface-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                      checked ? "border-primary bg-primary text-on-primary" : "border-border-strong",
                    )}
                    aria-hidden
                  >
                    {checked && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] leading-5 font-medium">
                      {share.personName?.trim() || "Zonder naam"}
                    </span>
                    <span className="block truncate text-[13px] leading-[18px] text-text-muted">
                      {share.counterparty}
                      {share.bookingDate && ` · ${formatDay(share.bookingDate)}`}
                      {ageDays >= SHOW_AGE_FROM_DAYS && ` · sinds ${ageDays} dagen`}
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatEuro(share.amount)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Pas een getal als er iets is aangetikt; de regel houdt wel zijn plek, zodat niets verspringt. */}
        <div
          className={cn("flex items-center justify-between text-[15px]", selected.size === 0 && "invisible")}
          aria-hidden={selected.size === 0}
        >
          <span className="text-text-muted">Samen</span>
          <span className="font-semibold tabular-nums">{formatEuro(selectedTotal)}</span>
        </div>

        <Button size="lg" fullWidth disabled={selected.size === 0} loading={pending} onClick={() => onConfirm([...selected])}>
          {selected.size === 0 ? "Verwerken" : `${formatEuro(incomingAmount)} verwerken`}
        </Button>
        </>
        )}
      </div>
    </Sheet>
  );
}
