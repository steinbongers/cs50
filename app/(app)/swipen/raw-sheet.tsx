"use client";

import { NoteField } from "@/components/transactions/note-field";
import { Sheet } from "@/components/ui/sheet";
import { formatEuro, formatLongDay, formatSignedEuro } from "@/lib/format";
import type { OpenTransaction } from "@/lib/transactions/queries";

interface RawSheetProps {
  open: boolean;
  onClose: () => void;
  transaction: OpenTransaction | null;
  /** Na opslaan: de kaart toont de notitie meteen (null = gewist). */
  onNoteSaved: (transactionId: string, note: string | null) => void;
}

/** De volledige banktekst achter de opgeschoonde kaart, plus je eigen notitie. */
export function RawSheet({ open, onClose, transaction, onNoteSaved }: RawSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Zoals de bank het stuurde">
      {transaction && (
        <div className="flex flex-col gap-6">
          <dl className="flex flex-col gap-4 text-[15px] leading-5">
            <div>
              <dt className="text-[13px] text-text-muted">Datum</dt>
              <dd className="font-medium">
                {formatLongDay(transaction.bookingDate)}
                {transaction.bookingTime && ` · ${transaction.bookingTime}`}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-text-muted">Bedrag</dt>
              <dd className="font-medium tabular-nums">{formatSignedEuro(transaction.amount)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-text-muted">Tegenpartij</dt>
              <dd className="font-medium break-words">{transaction.rawCounterparty ?? transaction.counterparty}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-text-muted">Omschrijving</dt>
              <dd className="break-words">{transaction.rawDescription ?? transaction.description ?? "Geen omschrijving"}</dd>
            </div>
            {transaction.balanceAfter !== null && (
              <div>
                <dt className="text-[13px] text-text-muted">Saldo daarna</dt>
                <dd className="font-medium tabular-nums">{formatEuro(transaction.balanceAfter)}</dd>
              </div>
            )}
          </dl>

          {/* Per kaart een vers formulier, zodat een half getypte notitie niet meeschuift. */}
          <NoteField key={transaction.id} transactionId={transaction.id} initialNote={transaction.note} onSaved={onNoteSaved} />
        </div>
      )}
    </Sheet>
  );
}
