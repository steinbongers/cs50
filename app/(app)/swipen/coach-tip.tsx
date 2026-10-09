"use client";

import { motion, useReducedMotion } from "framer-motion";
import { UNDO_WINDOW_MS } from "@/config/app";
import { cn } from "@/lib/utils";

/** Waar het pijltje van de ballon naar wijst: midden (de tegels), links (de schakelaar), rechts (Later). */
export type CoachArrow = "center" | "left" | "right";

export const COACH_STEPS: ReadonlyArray<{ title: string; text?: string; arrow: CoachArrow }> = [
  {
    title: "Elk kaartje is één betaling",
    text: "Tik op het potje waar hij hoort. Jij beslist, wij vullen niets in.",
    arrow: "center",
  },
  {
    title: "Vergist? Ongedaan maken",
    text: `Je hebt ${UNDO_WINDOW_MS / 1000} seconden. Geen zin in deze? Tik op Later.`,
    arrow: "right",
  },
  {
    title: "Samen betaald?",
    text: "Zet ‘Ik krijg een deel terug’ aan. Wij rekenen jouw deel uit.",
    arrow: "left",
  },
];

export const COACH_DONE_TEXT = "Je kent het nu. Succes.";

interface CoachTipProps {
  /** Stap uit COACH_STEPS, of "done" voor het korte afscheid. */
  step: number | "done";
  onDismiss?: () => void;
}

const arrowPosition: Record<CoachArrow, string> = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-8",
  right: "right-10",
};

/**
 * Begeleiding bij de eerste drie kaarten, als zwevende ballon met een pijltje.
 * Neemt geen hoogte in de layout in: de ouder plaatst hem `absolute`.
 */
export function CoachTip({ step, onDismiss }: CoachTipProps) {
  const reduce = useReducedMotion();
  const content = step === "done" ? null : COACH_STEPS[step];
  if (step !== "done" && !content) return null;
  const arrow: CoachArrow = content?.arrow ?? "center";

  return (
    <motion.aside
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.2 }}
      className="pointer-events-auto relative rounded-card bg-text px-4 py-3 text-bg shadow-float"
      aria-live="polite"
    >
      {content ? (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-5 font-semibold">{content.title}</p>
            {content.text && <p className="mt-0.5 text-[13px] leading-[18px] text-bg/80">{content.text}</p>}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-2 -mb-1.5 min-h-11 shrink-0 rounded-control px-3 text-[15px] font-semibold text-bg"
          >
            Snap ik
          </button>
        </div>
      ) : (
        <p className="text-[15px] leading-5 font-semibold">{COACH_DONE_TEXT}</p>
      )}
      <span
        aria-hidden
        className={cn("absolute -bottom-1.5 size-3 rotate-45 rounded-[2px] bg-text", arrowPosition[arrow])}
      />
    </motion.aside>
  );
}
