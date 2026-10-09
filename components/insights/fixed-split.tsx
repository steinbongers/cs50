"use client";

import { useState } from "react";
import { formatEuroWhole } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FixedSplitProps {
  fixed: number;
  rest: number;
  /** Deel vaste lasten, 0 tot 1. */
  share: number;
}

/**
 * Twee getallen en één balk: vaste lasten in de volle kleur, de rest in een lichtere stap
 * van dezelfde kleur, met 2 px ruimte ertussen. Tik op een deel voor het aandeel.
 */
export function FixedSplit({ fixed, rest, share }: FixedSplitProps) {
  const [selected, setSelected] = useState<"fixed" | "rest" | null>(null);
  const percent = Math.round(share * 100);
  const parts = [
    { key: "fixed" as const, label: "Vaste lasten", amount: fixed, percent, className: "bg-chart-out", grow: share },
    { key: "rest" as const, label: "De rest", amount: rest, percent: 100 - percent, className: "bg-chart-out-soft", grow: 1 - share },
  ];
  const focus = parts.find((p) => p.key === selected);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3">
        {parts.map((p) => (
          <div key={p.key} className="rounded-control bg-surface-muted px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-[13px] leading-[18px] text-text-muted">
              <span aria-hidden className={cn("size-2.5 rounded-[3px]", p.className, p.key === "rest" && "ring-1 ring-border-strong ring-inset")} />
              {p.label}
            </dt>
            <dd className="mt-0.5 text-[22px] leading-7 font-semibold">{formatEuroWhole(p.amount)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex h-11 items-center gap-0.5" role="group" aria-label="Verdeling van een gemiddelde maand">
        {parts.map((p, i) =>
          p.grow > 0 ? (
            <button
              key={p.key}
              type="button"
              aria-pressed={selected === p.key}
              aria-label={`${p.label}: ${formatEuroWhole(p.amount)} per maand, ${p.percent}%`}
              onClick={() => setSelected((cur) => (cur === p.key ? null : p.key))}
              className="flex h-full min-w-3 items-center rounded-control outline-none focus-visible:outline-2 focus-visible:outline-focus"
              style={{ flexGrow: p.grow, flexBasis: 0 }}
            >
              <span
                className={cn(
                  "block h-2 w-full transition-opacity duration-150",
                  p.className,
                  i === 0 ? "rounded-l-full" : "rounded-r-full",
                  (p.grow >= 1 || parts.filter((q) => q.grow > 0).length === 1) && "rounded-full",
                  selected !== null && selected !== p.key && "opacity-40",
                )}
              />
            </button>
          ) : null,
        )}
      </div>
      <p className="min-h-[18px] text-[13px] leading-[18px] text-text-muted" aria-live="polite">
        {focus ? `${focus.label}: ${focus.percent}% van een gemiddelde maand` : ""}
      </p>
    </div>
  );
}
