"use client";

import { KaartjeDetails } from "@/components/transactions/kaartje-details";
import { NoteField } from "@/components/transactions/note-field";
import { Sheet } from "@/components/ui/sheet";
import { formatEuro } from "@/lib/format";
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
          <KaartjeDetails
            transaction={{
              bookingDate: transaction.bookingDate,
              bookingTime: transaction.bookingTime,
              amount: transaction.amount,
              ownShare: null,
              counterparty: transaction.rawCounterparty ?? transaction.counterparty,
              description: transaction.rawDescription ?? transaction.description,
            }}
          >
            {transaction.balanceAfter !== null && (
              <div>
                <dt className="text-[13px] leading-[18px] text-text-muted">Saldo daarna</dt>
                <dd className="font-medium tabular-nums">{formatEuro(transaction.balanceAfter)}</dd>
              </div>
            )}
          </KaartjeDetails>

          {/* Per kaart een vers formulier, zodat een half getypte notitie niet meeschuift. */}
          <NoteField key={transaction.id} transactionId={transaction.id} initialNote={transaction.note} onSaved={onNoteSaved} />
        </div>
      )}
    </Sheet>
  );
}
