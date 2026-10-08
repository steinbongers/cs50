"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CategoryIcon } from "@/components/categories/category-icon";
import { IconPlus } from "@/components/ui/icons";
import { formatEuroWhole } from "@/lib/format";
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

const tileBase =
  "flex h-28 w-full flex-col items-center justify-start gap-1 rounded-card px-1.5 pt-3 pb-2.5 select-none " +
  "transition-colors duration-150";

/**
 * Alle potjes als gelijke tegels, drie per rij, in de vaste volgorde van de
 * gebruiker. Niets is voorgeselecteerd of gemarkeerd: de gebruiker beslist blanco.
 */
export function CategoryTiles({ categories, onPick, onAdd, pulseId, pulseKey, repayment }: CategoryTilesProps) {
  const reduce = useReducedMotion();
  const visible = categories.filter((c) => c.systemKey === null);
  const voorgeschoten = categoryColorClasses(VOORGESCHOTEN_CATEGORY.color);

  return (
    <ul role="list" className="grid grid-cols-3 gap-2">
      {repayment && (
        <li>
          <button
            type="button"
            onClick={repayment.onOpen}
            aria-label="Terugbetaling kiezen"
            className={cn(tileBase, "bg-surface shadow-card ring-2 ring-inset", voorgeschoten.ring, "hover:bg-surface-muted")}
          >
            <span className={cn("flex size-10 items-center justify-center rounded-full", voorgeschoten.bg, voorgeschoten.text)}>
              <CategoryIcon icon={VOORGESCHOTEN_CATEGORY.icon} size={20} />
            </span>
            <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight break-words">Terugbetaling</span>
            <span className="mt-auto text-[11px] tabular-nums text-text-muted">{formatEuroWhole(repayment.total)} open</span>
          </button>
        </li>
      )}

      {visible.map((category) => {
        const colors = categoryColorClasses(category.color);
        const pulsing = pulseId === category.id;
        return (
          <li key={category.id}>
            <motion.button
              key={pulsing ? pulseKey : undefined}
              type="button"
              onClick={() => onPick(category)}
              aria-label={`${category.name} kiezen`}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              animate={pulsing && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={cn(tileBase, "bg-surface shadow-card hover:bg-surface-muted")}
            >
              <span className={cn("flex size-10 items-center justify-center rounded-full", colors.bg, colors.text)} aria-hidden>
                <CategoryIcon icon={category.icon} size={20} />
              </span>
              <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight break-words">{category.name}</span>
              <span className="mt-auto text-[11px] tabular-nums text-text-muted" aria-hidden={category.spentThisPeriod === 0}>
                {category.spentThisPeriod === 0 ? " " : formatEuroWhole(category.spentThisPeriod)}
              </span>
            </motion.button>
          </li>
        );
      })}

      <li>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Nieuw potje maken"
          className={cn(tileBase, "border-2 border-dashed border-border text-text-muted hover:bg-surface-muted hover:text-text")}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted" aria-hidden>
            <IconPlus size={20} />
          </span>
          <span className="text-xs font-medium leading-tight">Nieuw potje</span>
          <span className="mt-auto text-[11px]">&nbsp;</span>
        </button>
      </li>
    </ul>
  );
}
