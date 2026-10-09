"use client";

import { useCallback, useState } from "react";
import { IconChevronRight } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { formatDayShort, formatEuro, formatEuroWhole } from "@/lib/format";
import type { FreeToSpend } from "@/lib/insights/free-to-spend";
import { freeUntilLabel } from "./overview-copy";

/**
 * "Vrij tot de 25e": je saldo min de vaste lasten die nog komen. Tik opent de
 * berekening, zodat het getal nooit uit de lucht komt vallen.
 */
export function FreeToSpendCard({ free }: { free: FreeToSpend }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const label = freeUntilLabel(free.until);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-card transition-transform duration-100 active:scale-[0.98] motion-reduce:transition-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-[18px] text-text-muted">{label}</span>
          <span className="block text-[22px] leading-7 font-semibold tabular-nums tracking-[-0.01em]">{formatEuroWhole(free.amount)}</span>
        </span>
        <span className="sr-only">Bekijk hoe dit is berekend</span>
        <IconChevronRight size={18} className="shrink-0 text-text-muted" />
      </button>
      <Sheet open={open} onClose={close} title={label} description="Je saldo min de vaste lasten die nog komen.">
        <dl className="flex flex-col divide-y">
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="font-medium">Saldo nu</dt>
            <dd className="font-semibold tabular-nums">{formatEuro(free.balance)}</dd>
          </div>
          {free.upcoming.length > 0 ? (
            <div className="py-3">
              <dt className="font-medium">Komende vaste lasten</dt>
              <dd>
                <ul className="mt-1 flex flex-col">
                  {free.upcoming.map((u) => (
                    <li key={u.key} className="flex items-center justify-between gap-3 py-1.5 text-[15px]">
                      <span className="min-w-0">
                        <span className="block truncate">{u.name}</span>
                        <span className="block text-[13px] leading-[18px] text-text-muted">Rond {formatDayShort(u.expectedDate)}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">{formatEuro(-u.amount)}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="font-medium">Komende vaste lasten</dt>
              <dd className="text-[13px] leading-[18px] text-text-muted">Geen meer deze maand</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="font-semibold">Vrij te besteden</dt>
            <dd className="font-semibold tabular-nums">{formatEuro(free.amount)}</dd>
          </div>
        </dl>
        <p className="mt-1 text-[13px] leading-[18px] text-text-muted">
          Een schatting. Vaste lasten herkennen we aan betalingen die elke maand terugkomen. Andere uitgaven zitten er
          niet in.
        </p>
      </Sheet>
    </>
  );
}
