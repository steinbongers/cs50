"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { formatDay, formatEuro } from "@/lib/format";
import type { OpenShare } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

interface SettleSheetProps {
  open: boolean;
  onClose: () => void;
  shares: OpenShare[];
  incomingAmount: number;
  pending?: boolean;
  onConfirm: (shareIds: string[]) => void;
}

/** Bij een Tikkie: tik aan welke delen van wie hiermee betaald zijn. */
export function SettleSheet({ open, onClose, shares, incomingAmount, pending = false, onConfirm }: SettleSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const groups = new Map<string, { counterparty: string; bookingDate: string; shares: OpenShare[] }>();
  for (const share of shares) {
    const group = groups.get(share.transactionId) ?? {
      counterparty: share.counterparty,
      bookingDate: share.bookingDate,
      shares: [],
    };
    group.shares.push(share);
    groups.set(share.transactionId, group);
  }

  const selectedTotal = shares.filter((s) => selected.has(s.id)).reduce((a, s) => a + s.amount, 0);

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
      title="Welk deel is dit?"
      description={`Je kreeg ${formatEuro(incomingAmount)}. Tik aan wie hiermee heeft terugbetaald.`}
    >
      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([transactionId, group]) => (
          <div key={transactionId}>
            <p className="mb-1.5 text-sm font-medium">
              {group.counterparty}
              {group.bookingDate && <span className="font-normal text-text-muted"> · {formatDay(group.bookingDate)}</span>}
            </p>
            <ul className="flex flex-col gap-1.5">
              {group.shares.map((share, index) => {
                const checked = selected.has(share.id);
                return (
                  <li key={share.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(share.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-control border px-3 text-left transition-colors duration-150",
                        checked ? "border-primary bg-primary-soft" : "bg-surface hover:bg-surface-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                          checked ? "border-primary bg-primary text-on-primary" : "border-border",
                        )}
                        aria-hidden
                      >
                        {checked && <IconCheck size={14} strokeWidth={3} />}
                      </span>
                      <span className="flex-1 truncate text-sm">{share.personName || `Persoon ${index + 1}`}</span>
                      <span className="text-sm font-medium tabular-nums">{formatEuro(share.amount)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>Gekozen</span>
          <span className="tabular-nums">{formatEuro(selectedTotal)}</span>
        </div>

        <Button size="lg" fullWidth disabled={selected.size === 0} loading={pending} onClick={() => onConfirm([...selected])}>
          Afronden
        </Button>
      </div>
    </Sheet>
  );
}
