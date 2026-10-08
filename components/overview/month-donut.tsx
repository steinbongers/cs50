"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { IconChevronRight } from "@/components/ui/icons";
import { isCategoryColor } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";

export interface DonutSlice {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
}

/** Meer dan zoveel potjes in de ring wordt onleesbaar; de rest gaat samen als "Overige". */
const MAX_SEGMENTS = 7;
const SIZE = 220;
const STROKE = 28;
/** Ruimte voor het dikkere, aangetikte segment, zodat het niet tegen de rand wordt afgekapt. */
const HIGHLIGHT = 6;
const RADIUS = (SIZE - STROKE - HIGHLIGHT) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 2px oppervlak tussen segmenten, zodat aangrenzende kleuren los van elkaar staan. */
const GAP = 2;

function strokeColor(color: string): string {
  return `var(--cat-${isCategoryColor(color) ? color : "grijs"})`;
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  const p = (part / total) * 100;
  return p < 1 ? "<1%" : `${Math.round(p)}%`;
}

/**
 * Ring met de uitgaven per potje, en daaronder dezelfde potjes als lijst.
 * De lijst is de legenda: icoon en naam dragen de betekenis, kleur is extra.
 * Tik op een segment of rij om dat potje in het midden te zien.
 */
export function MonthDonut({ slices, total, label }: { slices: DonutSlice[]; total: number; label: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = [...slices].filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, MAX_SEGMENTS);
  const tail = sorted.slice(MAX_SEGMENTS);
  const segments: DonutSlice[] =
    tail.length > 0
      ? [...head, { id: "__overig", name: "Overige potjes", icon: "package", color: "grijs", amount: tail.reduce((a, s) => a + s.amount, 0) }]
      : head;
  const ringTotal = segments.reduce((a, s) => a + s.amount, 0);

  const lengths = segments.map((s) => (ringTotal > 0 ? (s.amount / ringTotal) * CIRCUMFERENCE : 0));
  const arcs = segments.map((s, i) => {
    const start = lengths.slice(0, i).reduce((a, l) => a + l, 0);
    const visible = segments.length > 1 ? Math.max(lengths[i] - GAP, 0.5) : lengths[i];
    return { slice: s, dash: `${visible} ${CIRCUMFERENCE - visible}`, offset: -start };
  });

  const focus = segments.find((s) => s.id === selected) ?? null;
  const summary = segments.map((s) => `${s.name} ${formatEuroWhole(s.amount)}`).join(", ");

  return (
    <div className="flex flex-col gap-5">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Uitgaven ${label}: ${formatEuroWhole(total)}. ${summary}.`}
          className="-rotate-90"
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
          {arcs.map(({ slice, dash, offset: o }) => (
            <circle
              key={slice.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={strokeColor(slice.color)}
              strokeWidth={selected === slice.id ? STROKE + HIGHLIGHT : STROKE}
              strokeDasharray={dash}
              strokeDashoffset={o}
              opacity={selected && selected !== slice.id ? 0.35 : 1}
              className="cursor-pointer transition-[opacity,stroke-width] duration-150"
              onClick={() => setSelected((cur) => (cur === slice.id ? null : slice.id))}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center" aria-live="polite">
          {focus ? (
            <>
              <p className="line-clamp-2 text-sm text-text-muted">{focus.name}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatEuroWhole(focus.amount)}</p>
              <p className="text-xs text-text-muted">{percent(focus.amount, ringTotal)} van je uitgaven</p>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">Uitgegeven</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{formatEuroWhole(total)}</p>
            </>
          )}
        </div>
      </div>

      <ul className="flex flex-col divide-y rounded-card bg-surface shadow-card">
        {sorted.map((s) => (
          <li key={s.id}>
            <Link
              href={`/potjes/${s.id}`}
              onMouseEnter={() => setSelected(head.some((h) => h.id === s.id) ? s.id : "__overig")}
              onMouseLeave={() => setSelected(null)}
              className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
            >
              <CategoryBadge icon={s.icon} color={s.color} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-medium tabular-nums">{formatEuroWhole(s.amount)}</span>
                <span className="block text-xs tabular-nums text-text-muted">{percent(s.amount, ringTotal)}</span>
              </span>
              <IconChevronRight size={16} className="text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
