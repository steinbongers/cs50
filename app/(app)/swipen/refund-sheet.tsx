"use client";

import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuro } from "@/lib/format";
import type { CategoryOption } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

interface RefundSheetProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  /** Alleen uitgavepotjes: daar kan een terugbetaling van af. */
  categories: CategoryOption[];
  pending?: boolean;
  /** Een potje, of null: zonder potje (alleen van het totaal af). */
  onConfirm: (category: CategoryOption | null) => void;
}

/**
 * Geld terug gekregen: optioneel kies je waarvoor. Dan gaat het van dat potje af;
 * zonder keuze gaat het alleen van je totaal af. Inkomen wordt het nooit.
 */
export function RefundSheet({ open, onClose, amount, categories, pending = false, onConfirm }: RefundSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Geld terug"
      description={`${formatEuro(amount)} terug. Weet je waarvoor? Dan gaat het van dat potje af.`}
    >
      <div className="flex flex-col gap-4">
        <ul role="list" className="grid grid-cols-2 gap-1.5">
          {categories.map((category) => {
            const colors = categoryColorClasses(category.color);
            return (
              <li key={category.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onConfirm(category)}
                  className="flex min-h-12 w-full items-center gap-2 rounded-control border bg-surface px-2.5 text-left text-[15px] leading-5 transition-colors duration-150 active:bg-surface-muted disabled:opacity-50"
                >
                  <span
                    aria-hidden
                    className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", colors.bg, colors.text)}
                  >
                    <CategoryIcon icon={category.icon} size={16} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-1.5">
          <Button size="lg" variant="secondary" fullWidth disabled={pending} onClick={() => onConfirm(null)}>
            Zonder potje
          </Button>
          <p className="text-center text-[13px] leading-[18px] text-text-muted">
            Dan gaat het alleen van je totaal af, niet van een potje.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
