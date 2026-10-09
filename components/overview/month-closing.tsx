"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { setMonthFocus } from "@/app/(app)/overzicht/actions";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";
import type { MonthClosing } from "@/lib/insights/month-closing";
import { cn } from "@/lib/utils";

export interface FocusChoice {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/** Kleine confetti rond het icoon: vaste hoeken, zodat server en client hetzelfde tekenen. */
const SPARKS = [0, 40, 80, 125, 165, 200, 240, 285, 320].map((deg, i) => ({
  x: Math.cos((deg * Math.PI) / 180) * (34 + (i % 3) * 6),
  y: Math.sin((deg * Math.PI) / 180) * (34 + (i % 3) * 6),
  color: ["var(--primary)", "var(--accent)", "var(--positive)"][i % 3],
}));

function Celebration() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto flex size-20 items-center justify-center" aria-hidden>
      {!reduce &&
        SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ backgroundColor: s.color }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: s.x, y: s.y, opacity: [0, 1, 0], scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15 + (i % 3) * 0.04, ease: "easeOut" }}
          />
        ))}
      <motion.span
        className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong"
        initial={reduce ? false : { scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 14 }}
      >
        <PartyPopper size={28} />
      </motion.span>
    </div>
  );
}

/**
 * Maandafsluiting: verschijnt bij de eerste keer openen in een nieuwe periode.
 * De afgelopen maand in drie getallen, en de vraag op welk potje je deze maand let.
 * Niets voorgeselecteerd; "Sla over" is net zo goed.
 */
export function MonthClosingSheet({ closing, monthName, choices }: { closing: MonthClosing; monthName: string; choices: FocusChoice[] }) {
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Vaste referentie: de sheet zet bij een nieuwe onClose de focus opnieuw.
  const close = useCallback(() => setOpen(false), []);

  function choose(id: string) {
    setPicked(id);
    setFailed(false);
    startTransition(async () => {
      const result = await setMonthFocus(id);
      if (result.ok) setOpen(false);
      else setFailed(true);
    });
  }

  const stats = [
    { label: "Uitgegeven", value: formatEuroWhole(closing.spent) },
    closing.biggest
      ? { label: "Grootste potje", value: closing.biggest.name, sub: formatEuroWhole(closing.biggest.amount) }
      : { label: "Grootste potje", value: "Geen" },
    { label: closing.sorted === 1 ? "Kaartje gesorteerd" : "Kaartjes gesorteerd", value: String(closing.sorted) },
  ];

  return (
    <Sheet open={open} onClose={close} title={`${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} zit erop`}>
      <div className="flex flex-col gap-5 pb-2">
        <Celebration />
        <p className="-mt-2 text-center text-[15px] text-text-muted">Weer een maand bijgehouden. Netjes.</p>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="flex min-w-0 flex-col items-center rounded-card bg-surface-muted px-2 py-3 text-center">
              <dt className="text-[13px] leading-[18px] text-text-muted">{s.label}</dt>
              <dd className="mt-0.5 w-full truncate text-[17px] leading-[22px] font-semibold tabular-nums">{s.value}</dd>
              {"sub" in s && s.sub && <dd className="text-[13px] leading-[18px] text-text-muted tabular-nums">{s.sub}</dd>}
            </div>
          ))}
        </dl>

        {choices.length > 0 && (
          <section aria-labelledby="focus-question" className="flex flex-col gap-3">
            <h3 id="focus-question" className="text-[15px] font-semibold">
              Op welk potje let je deze maand?
            </h3>
            <div className="flex flex-wrap gap-2">
              {choices.map((c) => {
                const colors = categoryColorClasses(c.color);
                const isPicked = picked === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={pending}
                    aria-pressed={isPicked}
                    onClick={() => choose(c.id)}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[15px] font-medium transition-[background-color,transform] duration-100 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none",
                      isPicked ? cn(colors.bg, "border-transparent") : "bg-surface hover:bg-surface-muted",
                    )}
                  >
                    <CategoryIcon icon={c.icon} size={16} className={colors.text} />
                    {c.name}
                  </button>
                );
              })}
            </div>
            {failed && (
              <p className="text-[13px] leading-[18px] text-accent-strong" role="status">
                Dat lukte niet. Probeer het nog eens.
              </p>
            )}
          </section>
        )}

        <Button variant="ghost" fullWidth onClick={close} disabled={pending}>
          Sla over
        </Button>
      </div>
    </Sheet>
  );
}
