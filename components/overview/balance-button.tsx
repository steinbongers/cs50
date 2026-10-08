"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { formatDateTime, formatEuro } from "@/lib/format";
import type { AccountBalance } from "@/lib/insights/queries";

/** Rond pictogram rechtsboven; tik opent een paneel met het saldo per rekening. */
export function BalanceButton({ accounts }: { accounts: AccountBalance[] }) {
  const [open, setOpen] = useState(false);
  if (accounts.length === 0) return null;

  // Een totaal klopt alleen als we van elke rekening het saldo kennen.
  const allKnown = accounts.every((a) => a.balance !== null);
  const total = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const synced = accounts.map((a) => a.lastSyncedAt).filter(Boolean).sort().at(-1) ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Saldo bekijken"
        className="flex size-11 items-center justify-center rounded-full bg-surface text-text shadow-card hover:bg-surface-muted"
      >
        <Wallet size={20} aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Saldo">
        <ul className="flex flex-col divide-y">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{account.name}</p>
                {account.ibanMasked && <p className="text-xs text-text-muted">{account.ibanMasked}</p>}
              </div>
              <p className="text-base font-semibold tabular-nums">
                {account.balance === null ? <span className="text-sm font-normal text-text-muted">Niet bekend</span> : formatEuro(account.balance)}
              </p>
            </li>
          ))}
        </ul>
        {accounts.length > 1 && (
          <div className="mt-2 flex items-center justify-between border-t pt-3">
            <p className="text-sm text-text-muted">Totaal</p>
            <p className="font-semibold tabular-nums">
              {allKnown ? formatEuro(total) : <span className="text-sm font-normal text-text-muted">Niet bekend</span>}
            </p>
          </div>
        )}
        {synced && (
          <p className="mt-3 text-xs text-text-muted">
            Bijgewerkt {formatDateTime(synced)}
          </p>
        )}
      </Sheet>
    </>
  );
}
