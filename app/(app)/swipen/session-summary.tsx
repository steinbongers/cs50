"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { CategoryBadge } from "@/components/categories/category-badge";
import { formatEuroAbs } from "@/lib/format";
import { success } from "@/lib/haptics";
import { categoryColorClasses } from "@/lib/categories/palette";
import type { CategoryOption, OpenTransaction } from "@/lib/transactions/queries";
import { cn } from "@/lib/utils";

export interface Decision {
  transaction: OpenTransaction;
  category: CategoryOption;
  /** Jouw deel bij een gedeelde uitgave; undefined = het hele bedrag. */
  ownShare?: number;
}

interface SessionSummaryProps {
  decisions: Decision[];
  skipped: number;
  remaining: number;
}

/** Kop van het afrondmoment. "Stapel weg" alleen als de stapel echt leeg is. */
export function headline(count: number, remaining: number): string {
  if (count === 0) return "Niets gekozen, wel gekeken";
  if (count === 1) return remaining > 0 ? "Eén kaartje, klein maar fijn" : "Eén kaartje en de stapel is weg";
  if (remaining > 0) return count < 5 ? "Dat ging vlot" : "Even pauze, goed bezig";
  if (count < 5) return "Dat ging vlot";
  if (count <= 15) return "Stapel weg. Lekker bezig";
  return "Zo, dat was een flinke stapel";
}

/** "12 kaartjes in een potje, 3 op Later" */
export function summaryLine(assigned: number, skipped: number): string {
  const cards = assigned === 1 ? "1 kaartje" : `${assigned} kaartjes`;
  return skipped > 0 ? `${cards} in een potje, ${skipped} op Later` : `${cards} in een potje`;
}

/** Rustig afrondmoment met een korte samenvatting van deze ronde. */
export function SessionSummary({ decisions, skipped, remaining }: SessionSummaryProps) {
  const router = useRouter();
  const reduce = useReducedMotion();

  // Lege stapel: één keer een succestrilling (waar het toestel dat kan).
  useEffect(() => {
    if (remaining === 0) success();
  }, [remaining]);

  const totals = new Map<string, { category: CategoryOption; spent: number; count: number }>();
  for (const { transaction, category, ownShare } of decisions) {
    if (category.systemKey) continue;
    const entry = totals.get(category.id) ?? { category, spent: 0, count: 0 };
    if (transaction.amount < 0) entry.spent += ownShare ?? -transaction.amount;
    entry.count += 1;
    totals.set(category.id, entry);
  }
  const top = [...totals.values()].sort((a, b) => b.spent - a.spent)[0];
  const colors = top ? categoryColorClasses(top.category.color) : null;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {!reduce && decisions.length > 0 && <Sparkles />}

      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-positive-soft text-positive">
        <motion.svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <motion.path
            d="m5 12.5 4.5 4.5L19 7.5"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          />
        </motion.svg>
      </div>

      <h2 className="text-[22px] leading-7 font-semibold tracking-[-0.02em]">{headline(decisions.length, remaining)}</h2>

      <div className="mt-4 flex w-full flex-col gap-2">
        {top && top.spent > 0 && colors && (
          <div className="flex items-center gap-3 rounded-card bg-surface p-4 text-left shadow-card">
            <CategoryBadge icon={top.category.icon} color={top.category.color} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-[18px] text-text-muted">Grootste potje deze ronde</p>
              <p className="truncate text-[15px] leading-5 font-medium">
                <span className={cn("tabular-nums", colors.text)}>{formatEuroAbs(top.spent)}</span> naar{" "}
                {top.category.name}
              </p>
            </div>
          </div>
        )}
        <p className="text-[15px] leading-5 text-text-muted tabular-nums">{summaryLine(decisions.length, skipped)}</p>
      </div>

      <div className="mt-8 flex w-full flex-col gap-2">
        {remaining > 0 ? (
          <>
            <Button size="lg" fullWidth onClick={() => router.refresh()}>
              Volgende stapel ({remaining})
            </Button>
            <ButtonLink href="/overzicht" variant="ghost" size="lg" fullWidth>
              Straks verder
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/overzicht" size="lg" fullWidth>
            Naar je overzicht
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

const SPARKLE_COLORS = ["bg-cat-blauw", "bg-cat-oranje", "bg-cat-groen", "bg-cat-roze", "bg-cat-geel", "bg-cat-paars"];

/** Maximaal aantal deeltjes; het hele feestje duurt 600 ms. */
const SPARKLE_COUNT = 12;

/** Klein feestmoment: een handvol stipjes die kort opspatten. Geen confettikanon. */
function Sparkles() {
  const dots = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
    const distance = 70 + (i % 3) * 22;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 30,
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
      size: 5 + (i % 3) * 2,
      delay: (i % 4) * 0.025,
    };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[calc(50%-5rem)]">
      {dots.map((dot, i) => (
        <motion.span
          key={i}
          className={cn("absolute block rounded-full", dot.color)}
          style={{ width: dot.size, height: dot.size }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: dot.x, y: dot.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
          // Langste deeltje: 0,5 s + 0,075 s vertraging, dus binnen 600 ms klaar.
          transition={{ duration: 0.5, delay: dot.delay, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
