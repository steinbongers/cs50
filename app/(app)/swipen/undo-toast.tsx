"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { UNDO_WINDOW_MS } from "@/config/app";

interface UndoToastProps {
  /** Unieke sleutel van de laatste keuze; verandert bij elke nieuwe keuze. */
  id: string | null;
  /** Tekst links, bijvoorbeeld "In Boodschappen". */
  text: string;
  onUndo: () => void;
  /** Foutmelding: verschijnt in dezelfde pil, in rood, zonder knop. */
  error?: string | null;
}

const pillClasses =
  "pointer-events-auto relative flex h-10 w-full items-center justify-between gap-3 overflow-hidden rounded-full px-4 text-[13px] shadow-float";

/**
 * Pil onderin, boven de tabbalk: vier seconden "Ongedaan maken" na elke keuze,
 * met een streep van 2 px die leegloopt. Fouten verschijnen in dezelfde vorm,
 * zodat de layout nooit verspringt.
 */
export function UndoToast({ id, text, onUndo, error }: UndoToastProps) {
  const reduce = useReducedMotion();
  const enter = reduce ? { opacity: 0 } : { y: 12, opacity: 0 };
  const leave = reduce ? { opacity: 0 } : { y: 8, opacity: 0 };
  const transition = { duration: reduce ? 0.12 : 0.18, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[calc(28rem-2rem)]">
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.div
            key={`error-${error}`}
            role="alert"
            initial={enter}
            animate={{ y: 0, opacity: 1 }}
            exit={leave}
            transition={transition}
            className={`${pillClasses} bg-negative text-on-primary`}
          >
            <span className="min-w-0 truncate font-medium">{error}</span>
          </motion.div>
        ) : id ? (
          <motion.div
            key={id}
            role="status"
            initial={enter}
            animate={{ y: 0, opacity: 1 }}
            exit={leave}
            transition={transition}
            className={`${pillClasses} bg-text text-bg`}
          >
            <span className="min-w-0 truncate">{text}</span>
            <button
              type="button"
              onClick={onUndo}
              className="relative flex h-full shrink-0 items-center font-semibold after:absolute after:-inset-x-2 after:-inset-y-1 after:content-['']"
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
        ) : null}
      </AnimatePresence>
    </div>
  );
}
