"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { formatEuroWhole } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { categoryColorClasses } from "@/lib/categories/palette";
import { VOORGESCHOTEN_CATEGORY } from "@/lib/categories/types";
import type { CategoryOption } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

interface CategoryTilesProps {
  categories: CategoryOption[];
  onPick: (category: CategoryOption) => void;
  onAdd: () => void;
  pulseId: string | null;
  pulseKey: number;
  /** Alleen bij inkomend geld met openstaande delen: de tegel 'Terugbetaling'. */
  repayment?: { total: number; count: number; onOpen: () => void } | null;
}

/** Vanaf dit aantal tegels worden ze iets lager (72 px). */
const DENSE_FROM = 17;

/** Aantal tegels inclusief Terugbetaling en '+', voor de keuze van de tegelhoogte en sticky kaart. */
export function tileCount(categories: CategoryOption[], withRepayment: boolean): number {
  return categories.filter((c) => c.systemKey === null).length + (withRepayment ? 1 : 0) + 1;
}

function tileClasses(dense: boolean) {
  return cn(
    "relative flex w-full flex-col items-center gap-0.5 overflow-visible rounded-2xl px-1 pt-2 select-none",
    "compact:h-16 compact:pt-1.5",
    dense ? "h-[72px]" : "h-20",
    "transition-[transform,background-color] duration-100 ease-out-soft active:scale-[0.96]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  );
}

const nameClasses =
  "line-clamp-2 w-full text-center text-[11px] leading-[13px] font-medium hyphens-auto break-words";
const amountClasses = "mt-auto pb-1.5 text-[10px] leading-3 tabular-nums compact:hidden";

/** Bedrag deze maand in hele euro's; leeg bij € 0. */
function wholeAmount(value: number): string | null {
  const rounded = Math.round(value);
  return rounded === 0 ? null : formatEuroWhole(rounded);
}

/**
 * Alle potjes als gelijke tegels, vier per rij, in de vaste volgorde van de
 * gebruiker. Niets is voorgeselecteerd of gemarkeerd: de gebruiker beslist blanco.
 * Het bedrag van deze maand staat klein op de tegel (besluit van Stein).
 */
export function CategoryTiles({ categories, onPick, onAdd, pulseId, pulseKey, repayment }: CategoryTilesProps) {
  const reduce = useReducedMotion();
  const visible = categories.filter((c) => c.systemKey === null);
  const dense = tileCount(categories, Boolean(repayment)) >= DENSE_FROM;

  return (
    <ul role="list" className="mt-3 grid grid-cols-4 gap-1.5">
      {repayment && (
        <li>
          <button
            type="button"
            onClick={() => {
              tap();
              repayment.onOpen();
            }}
            aria-label={`Terugbetaling, ${formatEuroWhole(repayment.total)} open`}
            className={cn(tileClasses(dense), "bg-accent-soft ring-1 ring-accent/40 ring-inset active:bg-accent-soft")}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-accent" aria-hidden>
              <CategoryIcon icon={VOORGESCHOTEN_CATEGORY.icon} size={16} strokeWidth={1.75} />
            </span>
            <span className={nameClasses}>Terugbetaling</span>
            <span className={cn(amountClasses, "text-accent")}>{formatEuroWhole(repayment.total)} open</span>
          </button>
        </li>
      )}

      {visible.map((category) => {
        const colors = categoryColorClasses(category.color);
        const pulsing = pulseId === category.id;
        const amount = wholeAmount(category.spentThisPeriod);
        return (
          <motion.li
            // Bij elke keuze opnieuw afspelen: de key wisselt met pulseKey.
            key={pulsing ? `${category.id}-${pulseKey}` : category.id}
            animate={pulsing && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={() => {
                tap();
                onPick(category);
              }}
              aria-label={amount ? `${category.name}, ${amount} deze maand` : category.name}
              className={cn(tileClasses(dense), "bg-surface shadow-card active:bg-surface-muted")}
            >
              {pulsing && (
                <motion.span
                  aria-hidden
                  className={cn("pointer-events-none absolute inset-0 rounded-2xl", colors.bg)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.32, times: [0, 0.375, 1], ease: "easeOut" }}
                />
              )}
              <span
                className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-full", colors.bg, colors.text)}
                aria-hidden
              >
                <CategoryIcon icon={category.icon} size={16} strokeWidth={1.75} />
              </span>
              <span className={cn("relative", nameClasses)} aria-hidden>
                {category.name}
              </span>
              <span className={cn("relative text-text-muted", amountClasses)} aria-hidden>
                {amount ?? ""}
              </span>
            </button>
          </motion.li>
        );
      })}

      <li>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Nieuw potje maken"
          className={cn(tileClasses(dense), "border border-dashed border-border bg-transparent text-text-muted active:bg-surface-muted")}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted" aria-hidden>
            <Plus size={16} strokeWidth={1.75} />
          </span>
          <span className={nameClasses} aria-hidden>
            Nieuw
          </span>
        </button>
      </li>
    </ul>
  );
}
