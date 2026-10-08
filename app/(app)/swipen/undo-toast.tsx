"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UNDO_WINDOW_MS } from "@/config/app";

interface UndoToastProps {
  /** Unieke sleutel van de laatste keuze; verandert bij elke nieuwe keuze. */
  id: string | null;
  counterparty: string;
  categoryName: string;
  onUndo: () => void;
}

/** Vier seconden "Ongedaan maken" na elke keuze, met een leeglopend balkje. */
export function UndoToast({ id, counterparty, categoryName, onUndo }: UndoToastProps) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 pb-3">
      <AnimatePresence>
        {id && (
          <motion.div
            key={id}
            role="status"
            initial={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-card bg-text px-4 py-2.5 text-bg shadow-float"
          >
            <span className="flex min-w-0 flex-1 flex-col text-sm leading-tight">
              <span className="truncate text-bg/70">{counterparty}</span>
              <span className="truncate font-medium">naar {categoryName}</span>
            </span>
            <button
              type="button"
              onClick={onUndo}
              className="min-h-11 shrink-0 rounded-control px-3 text-sm font-semibold text-bg underline-offset-4 hover:underline"
            >
              Ongedaan maken
            </button>
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-bg/60"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: UNDO_WINDOW_MS / 1000, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
