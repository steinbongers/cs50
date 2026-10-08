"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IconSparkle } from "@/components/ui/icons";
import { UNDO_WINDOW_MS } from "@/config/app";

export const COACH_STEPS = [
  {
    title: "Dit is één uitgave van je rekening",
    text: "Tik hieronder op het potje waar hij hoort. Jij beslist, de app vult niets voor je in.",
  },
  {
    title: "Verkeerd potje? Geen stress",
    text: `Je hebt ${UNDO_WINDOW_MS / 1000} seconden om het ongedaan te maken. Even geen zin in deze? Zet hem op Later.`,
  },
  {
    title: "Betaald voor anderen?",
    text: "Zet 'Ik krijg geld terug' aan. De app rekent jouw deel uit en houdt bij wie je nog wat schuldig is.",
  },
] as const;

interface CoachTipProps {
  step: number;
  onDismiss: () => void;
}

/** Begeleiding bij de eerste drie kaarten. Daarna nooit meer. */
export function CoachTip({ step, onDismiss }: CoachTipProps) {
  const reduce = useReducedMotion();
  const content = COACH_STEPS[step];
  if (!content) return null;

  return (
    <motion.aside
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 rounded-card bg-primary-soft px-4 py-3 text-primary"
      aria-live="polite"
    >
      <IconSparkle size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{content.title}</p>
        <p className="mt-0.5 text-sm text-text">{content.text}</p>
      </div>
      <Button variant="ghost" onClick={onDismiss} className="-mr-2 min-h-11 shrink-0 px-3 text-primary">
        Snap ik
      </Button>
    </motion.aside>
  );
}
