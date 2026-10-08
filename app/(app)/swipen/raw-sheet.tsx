"use client";

import { Sheet } from "@/components/ui/sheet";
import { formatEuro, formatLongDay, formatSignedEuro } from "@/lib/format";
import type { OpenTransaction } from "@/lib/transactions/queries";

interface RawSheetProps {
  open: boolean;
  onClose: () => void;
  transaction: OpenTransaction | null;
}

/** De volledige banktekst achter de opgeschoonde kaart. */
export function RawSheet({ open, onClose, transaction }: RawSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Zoals de bank het stuurde">
      {transaction && (
        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="text-text-muted">Datum</dt>
            <dd className="font-medium">
              {formatLongDay(transaction.bookingDate)}
              {transaction.bookingTime && ` · ${transaction.bookingTime}`}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Bedrag</dt>
            <dd className="font-medium tabular-nums">{formatSignedEuro(transaction.amount)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Tegenpartij</dt>
            <dd className="font-medium break-words">{transaction.rawCounterparty ?? transaction.counterparty}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Omschrijving</dt>
            <dd className="break-words">{transaction.rawDescription ?? transaction.description ?? "Geen omschrijving"}</dd>
          </div>
          {transaction.balanceAfter !== null && (
            <div>
              <dt className="text-text-muted">Saldo na deze transactie</dt>
              <dd className="font-medium tabular-nums">{formatEuro(transaction.balanceAfter)}</dd>
            </div>
          )}
        </dl>
      )}
    </Sheet>
  );
}
