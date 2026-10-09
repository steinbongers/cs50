"use client";

import { useCallback, useState } from "react";
import { SharesList } from "@/app/(app)/potjes/shares-list";
import { CategoryIcon } from "@/components/categories/category-icon";
import { IconChevronRight } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import { formatEuroWhole } from "@/lib/format";
import type { AwaitingRefund, OpenShare } from "@/lib/transactions/queries";
import { AwaitingList } from "./awaiting-list";
import { sharesSummary } from "./share-groups";

/** "Wacht nog op geld terug: 2 uitgaven" */
function awaitingLine(count: number): string {
  return `Wacht nog op geld terug: ${count} ${count === 1 ? "uitgave" : "uitgaven"}`;
}

/**
 * "Nog € 36 te krijgen": één rij op het overzicht, tik opent de delen per persoon.
 * Uitgaven die op geld terug wachten staan er apart bij, als aantal: daar is geen afgesproken
 * bedrag, dus we verzinnen er ook geen. Blijft gemonteerd zolang de sheet open is, zodat
 * "Alles terug. Netjes." nog even te zien is.
 */
export function StillToReceive({ shares, awaiting = [] }: { shares: OpenShare[]; awaiting?: AwaitingRefund[] }) {
  const [open, setOpen] = useState(false);
  // De sheet toont wat er openstond bij het openen: een refresh na afvinken haalt anders
  // de kop of het succesbericht onder je duim weg. Afgevinkte regels verbergen de lijsten zelf.
  const [shown, setShown] = useState<{ shares: OpenShare[]; awaiting: AwaitingRefund[] }>({ shares, awaiting });
  const close = useCallback(() => setOpen(false), []);
  const total = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
  const hasShares = total > 0;
  const hasAwaiting = awaiting.length > 0;

  if (!hasShares && !hasAwaiting && !open) return null;

  return (
    <>
      {(hasShares || hasAwaiting) && (
        <button
          type="button"
          onClick={() => {
            setShown({ shares, awaiting });
            setOpen(true);
          }}
          className="flex min-h-14 w-full items-center gap-3 rounded-card bg-accent-soft px-4 py-2.5 text-left transition-transform duration-100 active:scale-[0.98]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center text-accent" aria-hidden>
            <CategoryIcon icon={VOORGESCHOTEN_CATEGORY.icon} size={22} />
          </span>
          <span className="min-w-0 flex-1">
            {hasShares ? (
              <>
                <span className="block text-[15px] font-semibold tabular-nums">Nog {formatEuroWhole(total)} te krijgen</span>
                <span className="block truncate text-[13px] text-text-muted">{sharesSummary(shares)}</span>
                {hasAwaiting && <span className="block truncate text-[13px] text-text-muted">{awaitingLine(awaiting.length)}</span>}
              </>
            ) : (
              <>
                <span className="block text-[15px] font-semibold">Wacht nog op geld terug</span>
                <span className="block truncate text-[13px] text-text-muted">
                  {awaiting.length} {awaiting.length === 1 ? "uitgave" : "uitgaven"}
                </span>
              </>
            )}
          </span>
          <IconChevronRight size={18} className="shrink-0 text-text-muted" />
        </button>
      )}
      <Sheet open={open} onClose={close} title="Nog te krijgen">
        <div className="flex flex-col gap-4">
          {shown.awaiting.length > 0 && (
            <section aria-labelledby="wacht-op-geld-terug" className="flex flex-col gap-1">
              <h3 id="wacht-op-geld-terug" className="text-[13px] leading-[18px] font-medium text-text-muted">
                Wacht op geld terug
              </h3>
              <AwaitingList expenses={shown.awaiting} onAllClosed={shown.shares.length > 0 ? undefined : close} />
            </section>
          )}
          {(shown.shares.length > 0 || shown.awaiting.length === 0) && (
            <section aria-labelledby={shown.awaiting.length > 0 ? "open-delen" : undefined} className="flex flex-col gap-1">
              {shown.awaiting.length > 0 && (
                <h3 id="open-delen" className="text-[13px] leading-[18px] font-medium text-text-muted">
                  Open delen
                </h3>
              )}
              <SharesList shares={shown.shares} onAllSettled={shown.awaiting.length > 0 ? undefined : close} />
            </section>
          )}
        </div>
      </Sheet>
    </>
  );
}
