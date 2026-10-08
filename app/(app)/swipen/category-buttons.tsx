"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CategoryIcon } from "@/components/categories/category-icon";
import { categoryColorClasses } from "@/lib/categories/palette";
import type { CategoryOption } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

interface CategoryButtonsProps {
  categories: CategoryOption[];
  onPick: (category: CategoryOption) => void;
  pulseId: string | null;
  pulseKey: number;
}

/**
 * Alle potjes als knoppen in rijen, in de vaste volgorde van de gebruiker.
 * Niets is voorgeselecteerd of gemarkeerd: de gebruiker beslist blanco.
 */
export function CategoryButtons({ categories, onPick, pulseId, pulseKey }: CategoryButtonsProps) {
  const reduce = useReducedMotion();

  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const colors = categoryColorClasses(category.color);
        const pulsing = pulseId === category.id;
        return (
          <li key={category.id}>
            <motion.button
              type="button"
              onClick={() => onPick(category)}
              aria-label={`${category.name} kiezen`}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              animate={pulsing && !reduce ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              // key op pulseKey zodat een tweede tik op hetzelfde potje opnieuw veert
              key={pulsing ? pulseKey : undefined}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-full border bg-surface py-1.5 pl-1.5 pr-3.5",
                "text-sm font-medium text-text shadow-card select-none",
                "transition-colors duration-150 hover:bg-surface-muted",
              )}
            >
              <span
                className={cn("flex size-8 items-center justify-center rounded-full", colors.bg, colors.text)}
                aria-hidden
              >
                <CategoryIcon icon={category.icon} size={17} />
              </span>
              <span className="truncate">{category.name}</span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
