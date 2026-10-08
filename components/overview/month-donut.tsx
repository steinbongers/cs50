"use client";

import { useState } from "react";
import { isCategoryColor } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";

export interface DonutSlice {
  id: string;
  name: string;
  color: string;
  amount: number;
}

/** Meer dan zoveel potjes in de ring wordt onleesbaar; de rest gaat samen als "Overige potjes". */
const MAX_SEGMENTS = 7;
const SIZE = 200;
const STROKE = 20;
/** Het aangetikte segment wordt iets dikker; ruimte zodat het niet tegen de rand wordt afgekapt. */
const HIGHLIGHT = 4;
const RADIUS = (SIZE - STROKE - HIGHLIGHT) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 2 px tussen segmenten, zodat aangrenzende kleuren los van elkaar staan. */
const GAP = 2;
const OTHER_ID = "__overige";
const OPEN_ID = "__open";

function strokeFor(slice: DonutSlice): string {
  if (slice.id === OPEN_ID) return "var(--text-muted)";
  return `var(--cat-${isCategoryColor(slice.color) ? slice.color : "grijs"})`;
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  const p = (part / total) * 100;
  return p < 1 ? "<1%" : `${Math.round(p)}%`;
}

interface MonthDonutProps {
  /** Uitgaven per potje in deze maand (alleen positieve bedragen tellen). */
  slices: DonutSlice[];
  /** Uitgaven op kaartjes die nog in geen potje zitten: een grijs segment "Nog in te delen". */
  unsorted: number;
  /** Totaal uitgegeven (potjes plus nog in te delen), in het midden. */
  total: number;
  /** Maandnaam voor de schermlezer. */
  label: string;
}

/**
 * Ring met de uitgaven per potje. In het midden het totaal; tik op een segment
 * en je ziet dat potje met zijn aandeel (het enige percentage op het overzicht).
 * De lijst eronder (op de pagina) is de legenda.
 */
export function MonthDonut({ slices, unsorted, total, label }: MonthDonutProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = slices.filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, MAX_SEGMENTS);
  const tail = sorted.slice(MAX_SEGMENTS);
  const segments: DonutSlice[] = [...head];
  if (tail.length > 0) {
    segments.push({ id: OTHER_ID, name: "Overige potjes", color: "grijs", amount: tail.reduce((a, s) => a + s.amount, 0) });
  }
  if (unsorted > 0) segments.push({ id: OPEN_ID, name: "Nog in te delen", color: "grijs", amount: unsorted });

  const ringTotal = segments.reduce((a, s) => a + s.amount, 0);
  const lengths = segments.map((s) => (ringTotal > 0 ? (s.amount / ringTotal) * CIRCUMFERENCE : 0));
  const arcs = segments.map((slice, i) => {
    const start = lengths.slice(0, i).reduce((a, l) => a + l, 0);
    const visible = segments.length > 1 ? Math.max(lengths[i] - GAP, 0.5) : lengths[i];
    return { slice, dash: `${visible} ${CIRCUMFERENCE - visible}`, offset: -start };
  });

  const focus = segments.find((s) => s.id === selected) ?? null;
  const summary = segments.map((s) => `${s.name} ${formatEuroWhole(s.amount)}`).join(", ");

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Uitgegeven in ${label}: ${formatEuroWhole(total)}. ${summary}.`}
        className="-rotate-90"
      >
        {ringTotal <= 0 && (
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        )}
        {arcs.map(({ slice, dash, offset }) => (
          <circle
            key={slice.id}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={strokeFor(slice)}
            strokeLinecap="butt"
            strokeWidth={selected === slice.id ? STROKE + HIGHLIGHT : STROKE}
            strokeDasharray={dash}
            strokeDashoffset={offset}
            opacity={selected && selected !== slice.id ? 0.35 : slice.id === OPEN_ID ? 0.45 : 1}
            className="cursor-pointer transition-[opacity,stroke-width] duration-150"
            onClick={() => setSelected((cur) => (cur === slice.id ? null : slice.id))}
          />
        ))}
      </svg>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center"
        aria-live="polite"
      >
        {focus ? (
          <>
            <p className="line-clamp-2 text-[13px] text-text-muted">{focus.name}</p>
            <p className="text-[30px] leading-9 font-semibold tabular-nums tracking-[-0.02em]">{formatEuroWhole(focus.amount)}</p>
            <p className="text-[13px] text-text-muted tabular-nums">{percent(focus.amount, ringTotal)}</p>
          </>
        ) : (
          <>
            <p className="text-[13px] text-text-muted">Uitgegeven</p>
            <p className="text-[30px] leading-9 font-semibold tabular-nums tracking-[-0.02em]">{formatEuroWhole(total)}</p>
          </>
        )}
      </div>
    </div>
  );
}
