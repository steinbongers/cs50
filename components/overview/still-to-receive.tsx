"use client";

import { useCallback, useState } from "react";
import { SharesList } from "@/app/(app)/potjes/shares-list";
import { CategoryIcon } from "@/components/categories/category-icon";
import { IconChevronRight } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import { formatEuroWhole } from "@/lib/format";
import type { OpenShare } from "@/lib/transactions/queries";
import { sharesSummary } from "./share-groups";

/**
 * "Nog € 36 te krijgen": één rij op het overzicht, tik opent de delen per persoon.
 * Blijft gemonteerd zolang de sheet open is, zodat "Alles terug. Netjes." nog even te zien is.
 */
export function StillToReceive({ shares }: { shares: OpenShare[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const total = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;

  if (total <= 0 && !open) return null;

  return (
    <>
      {total > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-14 w-full items-center gap-3 rounded-card bg-accent-soft px-4 py-2.5 text-left transition-transform duration-100 active:scale-[0.98]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center text-accent" aria-hidden>
            <CategoryIcon icon={VOORGESCHOTEN_CATEGORY.icon} size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tabular-nums">Nog {formatEuroWhole(total)} te krijgen</span>
            <span className="block truncate text-[13px] text-text-muted">{sharesSummary(shares)}</span>
          </span>
          <IconChevronRight size={18} className="shrink-0 text-text-muted" />
        </button>
      )}
      <Sheet open={open} onClose={close} title="Nog te krijgen">
        <SharesList shares={shares} onAllSettled={close} />
      </Sheet>
    </>
  );
}
