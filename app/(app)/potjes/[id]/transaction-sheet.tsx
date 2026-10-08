"use client";

import { NoteField } from "@/components/transactions/note-field";
import { CategoryPickerGrid, type CategoryPickerGridItem } from "@/components/categories/category-picker-grid";
import { Sheet } from "@/components/ui/sheet";
import { formatDay, formatEuro, formatSignedEuro } from "@/lib/format";
import type { DetailTransaction } from "./potje-detail";

/** Tekens tellen zoals de server (codepoints), zodat emoji niet dubbel tellen. */

interface TransactionSheetProps {
  transaction: DetailTransaction | null;
  currentCategoryId: string;
  categories: CategoryPickerGridItem[];
  onClose: () => void;
  onMove: (transaction: DetailTransaction, categoryId: string) => void;
  onNoteSaved: (transactionId: string, note: string | null) => void;
}

/** Eén kaartje uit het potje: volledige banktekst, notitie en naar een ander potje. */
export function TransactionSheet({
  transaction,
  currentCategoryId,
  categories,
  onClose,
  onMove,
  onNoteSaved,
}: TransactionSheetProps) {
  const amount = transaction ? (transaction.ownShare !== null ? -transaction.ownShare : transaction.amount) : 0;

  return (
    <Sheet
      open={transaction !== null}
      onClose={onClose}
      title={transaction?.counterparty ?? "Kaartje"}
      description={transaction ? `${formatDay(transaction.bookingDate)} · ${formatSignedEuro(amount)}` : undefined}
    >
      {transaction && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-1.5" aria-label="Banktekst">
            <h3 className="text-[13px] font-medium text-text-muted">
              Banktekst
            </h3>
            <p className="rounded-control bg-surface-muted px-4 py-3 text-[13px] leading-[18px] break-words whitespace-pre-line">
              {transaction.bankText || "De bank stuurde geen omschrijving mee."}
            </p>
            {transaction.ownShare !== null && (
              <p className="text-[13px] text-text-muted">
                Jouw deel van {formatEuro(Math.abs(transaction.amount))}
              </p>
            )}
          </section>

          <NoteField key={transaction.id} transactionId={transaction.id} initialNote={transaction.note} onSaved={onNoteSaved} />

          <section className="flex flex-col gap-2">
            <h3 className="text-[13px] font-medium text-text-muted">Naar ander potje</h3>
            <CategoryPickerGrid
              categories={categories}
              selectedId={currentCategoryId}
              onPick={(id) => {
                if (id === currentCategoryId) return;
                onMove(transaction, id);
              }}
              label="Naar ander potje"
            />
          </section>
        </div>
      )}
    </Sheet>
  );
}
