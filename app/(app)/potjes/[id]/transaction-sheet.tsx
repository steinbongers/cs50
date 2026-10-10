"use client";

import { CategoryPickerGrid, type CategoryPickerGridItem } from "@/components/categories/category-picker-grid";
import { KaartjeDetails } from "@/components/transactions/kaartje-details";
import { NoteField } from "@/components/transactions/note-field";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { DetailTransaction } from "./potje-detail";

interface TransactionSheetProps {
  transaction: DetailTransaction | null;
  currentCategoryId: string;
  categories: CategoryPickerGridItem[];
  onClose: () => void;
  onMove: (transaction: DetailTransaction, categoryId: string) => void;
  /** Niet meetellen: buiten maand, Overzicht en potjes. */
  onExclude?: (transaction: DetailTransaction) => void;
  onNoteSaved: (transactionId: string, note: string | null) => void;
}

/** Eén kaartje uit het potje: volledige banktekst, notitie en naar een ander potje. */
export function TransactionSheet({
  transaction,
  currentCategoryId,
  categories,
  onClose,
  onMove,
  onExclude,
  onNoteSaved,
}: TransactionSheetProps) {
  return (
    <Sheet
      open={transaction !== null}
      onClose={onClose}
      title={transaction?.counterparty ?? "Kaartje"}>
      {transaction && (
        <div className="flex flex-col gap-6">
          <KaartjeDetails
            transaction={{
              bookingDate: transaction.bookingDate,
              bookingTime: transaction.bookingTime,
              amount: transaction.amount,
              ownShare: transaction.ownShare,
              counterparty: transaction.rawCounterparty,
              description: transaction.rawDescription,
            }}
          />

          <NoteField key={transaction.id} transactionId={transaction.id} initialNote={transaction.note} onSaved={onNoteSaved} />

          <section className="flex flex-col gap-2">
            <h3 className="text-[13px] leading-[18px] font-medium text-text-muted">Naar ander potje</h3>
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

          {onExclude && (
            <section className="flex flex-col gap-1.5 border-t border-border pt-4">
              <Button variant="secondary" fullWidth onClick={() => onExclude(transaction)}>
                Niet meetellen
              </Button>
              <p className="text-center text-[13px] leading-[18px] text-text-muted">
                Dan telt dit kaartje niet mee in je maand, Overzicht en potjes. Terugzetten kan bij Alle kaartjes.
              </p>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}
