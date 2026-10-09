"use client";

import { useId, useState, useTransition } from "react";
import { parseEuroInput } from "@/app/(app)/potjes/[id]/goal-sheet";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CategoryPickerGrid, type CategoryPickerGridItem } from "@/components/categories/category-picker-grid";
import { Button } from "@/components/ui/button";
import { IconChevronRight } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { CONTANT_CATEGORY } from "@/lib/categories/types";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuro } from "@/lib/format";
import { CASH_NOTE_MAX } from "@/lib/transactions/cash";
import { cn } from "@/lib/utils";
import { addCashSpend } from "./actions";
import { EuroInput } from "./euro-input";

interface CashWalletProps {
  /** Contant over, groter dan nul. */
  remaining: number;
  /** Gewone uitgavenpotjes om uit te kiezen. */
  categories: CategoryPickerGridItem[];
}

/** Hele euro's zonder decimalen, anders met centen: "€ 30" of "€ 12,50". */
function walletAmount(value: number): string {
  return Number.isInteger(value) ? formatEuro(value).replace(/,00$/, "") : formatEuro(value);
}

/**
 * "Contant over": één rij op het overzicht. Tik opent "Contante uitgave toevoegen":
 * bedrag, potje en eventueel een notitie. Niets is vooraf gekozen.
 */
export function CashWallet({ remaining, categories }: CashWalletProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const amountId = useId();
  const noteId = useId();
  const errorId = useId();
  const colors = categoryColorClasses(CONTANT_CATEGORY.color);

  function close() {
    setOpen(false);
    setValue("");
    setCategoryId(null);
    setNote("");
    setError(null);
  }

  function save() {
    const amount = parseEuroInput(value);
    if (amount === null || amount <= 0) {
      setError("Vul een bedrag boven € 0 in.");
      return;
    }
    if (amount > remaining) {
      setError(`Je hebt nog ${formatEuro(remaining)} contant.`);
      return;
    }
    if (!categoryId) {
      setError("Kies een potje.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addCashSpend(amount, categoryId, note.trim() || null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-card bg-surface px-4 py-2.5 text-left shadow-card transition-transform duration-100 active:scale-[0.98]"
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", colors.bg, colors.text)} aria-hidden>
          <CategoryIcon icon={CONTANT_CATEGORY.icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tabular-nums">Contant over: {walletAmount(remaining)}</span>
          <span className="block truncate text-[13px] text-text-muted">Iets contant betaald? Zet het in een potje</span>
        </span>
        <IconChevronRight size={18} className="shrink-0 text-text-muted" />
      </button>

      <Sheet
        open={open}
        onClose={close}
        title="Contante uitgave toevoegen"
        description={`Nog ${formatEuro(remaining)} contant.`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={amountId} className="text-[13px] leading-[18px] font-medium text-text-muted">
              Bedrag
            </label>
            <EuroInput
              id={amountId}
              placeholder="0"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <section className="flex flex-col gap-2" aria-label="Potje">
            <h3 className="text-[13px] leading-[18px] font-medium text-text-muted">Potje</h3>
            <CategoryPickerGrid
              categories={categories}
              selectedId={categoryId}
              onPick={(id) => {
                setCategoryId(id);
                setError(null);
              }}
              label="Potje"
            />
          </section>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={noteId} className="text-[13px] leading-[18px] font-medium text-text-muted">
              Notitie (mag leeg)
            </label>
            <Input
              id={noteId}
              value={note}
              maxLength={CASH_NOTE_MAX}
              placeholder="Markt, kapper, fooi"
              autoComplete="off"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p id={errorId} className="text-[13px] leading-[18px] text-negative" role="alert">
              {error}
            </p>
          )}

          <Button size="lg" fullWidth loading={isPending} disabled={isPending} onClick={save}>
            Toevoegen
          </Button>
        </div>
      </Sheet>
    </>
  );
}
