"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatDay, formatEuro } from "@/lib/format";
import type { OpenShare } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

interface SettleSheetProps {
  open: boolean;
  onClose: () => void;
  shares: OpenShare[];
  incomingAmount: number;
  /** Tegenpartij van het binnengekomen geld, om delen met dezelfde naam bovenaan te zetten. */
  incomingCounterparty: string;
  pending?: boolean;
  onConfirm: (shareIds: string[]) => void;
}

/** Vanaf deze leeftijd tonen we hoe lang een deel al openstaat. */
const SHOW_AGE_FROM_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Hoofdletterongevoelige bevat-match tussen een naam en de tegenpartij, in beide richtingen. */
export function nameMatches(personName: string | null, counterparty: string): boolean {
  const name = personName?.trim().toLowerCase();
  const other = counterparty.trim().toLowerCase();
  if (!name || !other) return false;
  return other.includes(name) || name.includes(other);
}

/**
 * Bij binnengekomen geld: tik aan welke delen hiermee betaald zijn. Delen met
 * dezelfde naam als de tegenpartij staan bovenaan, maar we vinken niets aan.
 */
export function SettleSheet({
  open,
  onClose,
  shares,
  incomingAmount,
  incomingCounterparty,
  pending = false,
  onConfirm,
}: SettleSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // Eén peilmoment per sheet (de sheet krijgt per kaart een eigen key).
  const [now] = useState(() => Date.now());

  const ordered = shares
    .map((share, index) => ({ share, index, match: nameMatches(share.personName, incomingCounterparty) }))
    .sort((a, b) => Number(b.match) - Number(a.match) || a.index - b.index);

  const selectedTotal = Math.round(shares.filter((s) => selected.has(s.id)).reduce((a, s) => a + s.amount, 0) * 100) / 100;

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
      title="Wie betaalt je terug?"
      description={`${formatEuro(incomingAmount)} binnen. Tik aan van wie.`}
    >
      <div className="flex flex-col gap-4">
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
      </div>
    </Sheet>
  );
}
