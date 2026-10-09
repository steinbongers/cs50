"use client";

import { useState } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { isCategoryColor } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";
import { cn } from "@/lib/utils";
import { barPath } from "./chart-parts";

export interface PotjeRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** Uitgegeven per maand, oudste eerst; de laatste is de lopende maand. */
  values: number[];
  /** Gemiddeld per volle maand, of null. */
  average: number | null;
  /** De verzamelrij voor de kleinere potjes. */
  other?: boolean;
}

const BAR = 8;
const GAP = 4;
const HEIGHT = 28;

/**
 * Kleine veelvouden: per potje een rijtje staafjes in de potjeskleur, elk op een eigen
 * schaal. De naam staat ernaast, dus de kleur hoeft het potje niet alleen te dragen.
 * Tik op een rij voor de bedragen per maand.
 */
export function PotjeMultiples({ rows, months }: { rows: PotjeRow[]; months: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const count = months.length;
  const width = count * BAR + (count - 1) * GAP;

  return (
    <ul className="-mx-4 divide-y">
      {rows.map((row) => {
        const fill = `var(--cat-${isCategoryColor(row.color) ? row.color : "grijs"})`;
        const max = Math.max(...row.values);
        const isOpen = open === row.id;
        const current = row.values.at(-1) ?? 0;
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => setOpen((cur) => (cur === row.id ? null : row.id))}
              aria-expanded={isOpen}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              <CategoryBadge icon={row.icon} color={row.color} size="sm" className={cn(row.other && "opacity-70")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{row.name}</span>
                <span className="block truncate text-[13px] leading-[18px] text-text-muted tabular-nums">
                  {row.average !== null ? `Gem. ${formatEuroWhole(row.average)}` : "Nog geen gemiddelde"}
                </span>
              </span>
              <svg width={width} height={HEIGHT} aria-hidden className="shrink-0">
                <line x1={0} x2={width} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} stroke="var(--border-strong)" strokeWidth={1} />
                {row.values.map((v, i) => {
                  const h = max > 0 ? (v / max) * (HEIGHT - 1) : 0;
                  return (
                    <path
                      key={i}
                      d={barPath(i * (BAR + GAP), HEIGHT - 1 - h, BAR, h, 3)}
                      fill={fill}
                      opacity={row.other ? 0.55 : 1}
                    />
                  );
                })}
              </svg>
              <span className="w-16 shrink-0 text-right text-[15px] font-semibold tabular-nums">{formatEuroWhole(current)}</span>
            </button>
            {isOpen && (
              <dl className="grid px-4 pb-3 text-center" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
                {row.values.map((v, i) => (
                  <div key={months[i]} className="flex flex-col">
                    <dt className="text-[11px] leading-[13px] text-text-muted">{months[i]}</dt>
                    <dd className="text-[13px] leading-[18px] font-medium tabular-nums">{formatEuroWhole(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
