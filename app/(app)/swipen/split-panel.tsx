"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * "Ik krijg een deel terug" staat aan of uit. Er valt niets te kiezen: de hele uitgave gaat
 * in het potje en de app houdt bij wat er terugkomt (besluit van Stein, geen aantal personen,
 * geen via of buiten de bank). Oude verdelingen met open delen blijven gewoon werken.
 */
export interface SplitState {
  enabled: boolean;
}

export const EMPTY_SPLIT: SplitState = { enabled: false };

/**
 * De regel die inschuift als "Ik krijg een deel terug" aan staat: één rustige zin, even hoog
 * als de actieregel (52 px met marge), zodat de hoogtesom van het scherm gelijk blijft.
 */
export function SplitRow({ open }: { open: boolean }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="split-row"
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1, transition: { duration: 0.12 } } : { height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0.12 } } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <p className="mt-2 flex h-11 items-center px-1 text-[13px] leading-[18px] text-text-muted">
            <span className="line-clamp-2">Je houdt bij wat er terugkomt. Je eigen deel volgt vanzelf.</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
