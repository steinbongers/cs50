"use client";

import { useId, useState, useTransition } from "react";
import { CategoryPickerGrid } from "@/components/categories/category-picker-grid";
import { KaartjeDetails } from "@/components/transactions/kaartje-details";
import { NoteField } from "@/components/transactions/note-field";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ACTION_LABEL } from "@/config/app";
import type { SearchResult } from "@/lib/transactions/search";
import { moveTransaction } from "../potjes/actions";
import type { ListCategory } from "./transaction-list";

interface TransactionSheetProps {
  /** De open rij, of null als de sheet dicht is. */
  transaction: SearchResult | null;
  categories: ListCategory[];
  onClose: () => void;
}

/** Details van één betaling: banktekst, notitie en (als hij al in een potje zit) verplaatsen. */
export function TransactionSheet({ transaction, categories, onClose }: TransactionSheetProps) {
  return (
    <Sheet
      open={transaction !== null}
      onClose={onClose}
      title={transaction?.counterparty ?? ""}
    >
      {/* Per rij een vers formulier, zodat een half getypte notitie niet meeschuift. */}
      {transaction && <SheetBody key={transaction.id} transaction={transaction} categories={categories} />}
    </Sheet>
  );
}

function SheetBody({ transaction, categories }: { transaction: SearchResult; categories: ListCategory[] }) {
  const current = transaction.categoryId ? categories.find((c) => c.id === transaction.categoryId) : undefined;
  const onStack = transaction.categoryId === null;

  return (
    <div className="flex flex-col gap-6">
      <KaartjeDetails
        transaction={{
          bookingDate: transaction.bookingDate,
          bookingTime: transaction.bookingTime,
          amount: transaction.amount,
          ownShare: transaction.ownShare,
          counterparty: transaction.rawCounterparty ?? transaction.counterparty,
          // Contant heeft geen banktekst: alleen de korte notitie van het verdelen, als die er is.
          description: transaction.isCash
            ? transaction.description
              ? `Contant betaald: ${transaction.description}`
              : "Contant betaald"
            : (transaction.rawDescription ?? transaction.description),
        }}
      >
        <div>
          <dt className="text-[13px] leading-[18px] text-text-muted">Potje</dt>
          <dd className="font-medium">{current ? current.name : "Nog op de stapel"}</dd>
        </div>
      </KaartjeDetails>

      <NoteField key={transaction.id} transactionId={transaction.id} initialNote={transaction.note} />

      {onStack ? (
        <section className="flex flex-col gap-3" aria-label="Indelen">
          <p className="text-[15px] text-text-muted">
            Dit kaartje ligt nog op de stapel. Daar kies je het potje, en deel je het als je geld terugkrijgt.
          </p>
          <ButtonLink href="/swipen" fullWidth>
            Naar {ACTION_LABEL}
          </ButtonLink>
        </section>
      ) : current?.isSystem ? (
        <p className="text-[15px] text-text-muted">Dit kaartje hoort bij {current.name}. Dat verplaats je hier niet.</p>
      ) : (
        <MoveSection transaction={transaction} categories={categories} />
      )}
    </div>
  );
}

function MoveSection({ transaction, categories }: { transaction: SearchResult; categories: ListCategory[] }) {
  const headingId = useId();
  const [selected, setSelected] = useState(transaction.categoryId);
  const [error, setError] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pickable = categories.filter((c) => !c.isSystem && !c.archived);

  function pick(id: string) {
    if (id === selected || isPending) return;
    const previous = selected;
    setSelected(id);
    setError(null);
    setMoved(false);
    startTransition(async () => {
      const result = await moveTransaction(transaction.id, id);
      if (!result.ok) {
        setSelected(previous);
        setError(result.error);
        return;
      }
      setMoved(true);
    });
  }

  const target = pickable.find((c) => c.id === selected);

  return (
    <section className="flex flex-col gap-3" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-[13px] leading-[18px] font-medium text-text-muted">
        Naar ander potje
      </h3>
      <CategoryPickerGrid
        categories={pickable}
        selectedId={selected}
        onPick={pick}
        disabledIds={isPending ? pickable.map((c) => c.id) : undefined}
        label="Naar ander potje"
      />
      <p className="min-h-[18px] text-[13px] leading-[18px]" role="status">
        {error ? (
          <span className="text-negative">{error}</span>
        ) : moved && target ? (
          <span className="text-text-muted">Verplaatst naar {target.name}.</span>
        ) : null}
      </p>
    </section>
  );
}
