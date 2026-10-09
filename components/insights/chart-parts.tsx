"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Breedte van een element in px, bijgehouden met een ResizeObserver. Grafieken tekenen
 * op echte pixels, zodat tekst in de SVG op elke schermbreedte even groot blijft.
 */
export function useWidth<T extends HTMLElement>(fallback = 311) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/** Staaf met een afgeronde bovenkant (4 px) en een rechte voet op de basislijn. */
export function barPath(x: number, y: number, w: number, h: number, radius = 4): string {
  if (h <= 0 || w <= 0) return "";
  const r = Math.min(radius, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

interface ChartCardProps {
  /** De conclusie in één zin, niet "Grafiek van ...". */
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  /** Dezelfde cijfers als tabel: de toegankelijke tweeling van de grafiek. */
  table: ReactNode;
  footnote?: string | null;
  children: ReactNode;
}

/** Kaart met kop, legenda, grafiek en een schakelaar "Als tabel". */
export function ChartCard({ title, subtitle, legend, table, footnote, children }: ChartCardProps) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="rounded-card bg-surface p-4 shadow-card">
      <h2 className="text-[17px] leading-[22px] font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] leading-[18px] text-text-muted">{subtitle}</p>}
      {legend && !asTable && <div className="mt-3">{legend}</div>}
      <div className="mt-3">{asTable ? table : children}</div>
      <div className="-mb-2 mt-1 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-text-muted">{footnote}</p>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="-mr-2 flex min-h-11 shrink-0 items-center rounded-control px-2 text-[13px] font-medium text-primary transition-colors duration-150 hover:bg-surface-muted"
        >
          {asTable ? "Als grafiek" : "Als tabel"}
        </button>
      </div>
    </section>
  );
}

export interface LegendItem {
  label: string;
  /** CSS-kleur van de reeks, bijvoorbeeld `var(--chart-in)`. */
  color: string;
  /** Vlak voor staven, lijn voor lijnen, gestippeld voor een gemiddelde. */
  mark: "rect" | "line" | "dashed";
}

/** Legenda: de vorm volgt de mark (vlak voor staven, lijn voor lijnen). Tekst in tekstkleur. */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[13px] leading-[18px] text-text-muted">
          {item.mark === "rect" ? (
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: item.color }} />
          ) : (
            <svg aria-hidden width="16" height="4" className="shrink-0">
              <line
                x1="1"
                y1="2"
                x2="15"
                y2="2"
                stroke={item.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={item.mark === "dashed" ? "3 3" : undefined}
              />
            </svg>
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export interface TooltipRow {
  value: string;
  label: string;
  /** Kleur van het lijnsleuteltje; leeg = geen sleutel. */
  color?: string;
  dashed?: boolean;
}

const TOOLTIP_WIDTH = 168;

/** Uitleesvak boven de grafiek, op x uitgelijnd en binnen de kaart gehouden. Waarde eerst, label erna. */
export function ChartTooltip({ x, width, title, rows }: { x: number; width: number; title: string; rows: TooltipRow[] }) {
  const left = Math.min(Math.max(0, x - TOOLTIP_WIDTH / 2), Math.max(0, width - TOOLTIP_WIDTH));
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-control bg-surface px-3 py-2 shadow-float"
      style={{ left, width: TOOLTIP_WIDTH }}
    >
      <p className="truncate text-[11px] leading-[13px] text-text-muted">{title}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-1.5 text-[13px] leading-[18px]">
            {row.color ? (
              <svg aria-hidden width="12" height="4" className="shrink-0">
                <line
                  x1="1"
                  y1="2"
                  x2="11"
                  y2="2"
                  stroke={row.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={row.dashed ? "2 3" : undefined}
                />
              </svg>
            ) : (
              <span aria-hidden className="w-3 shrink-0" />
            )}
            <span className="font-semibold tabular-nums">{row.value}</span>
            <span className="truncate text-text-muted">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Eenvoudige tabel voor de tabelweergave van een grafiek. */
export function ChartTable({ head, rows, className }: { head: string[]; rows: (string | number)[][]; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-[13px] leading-[18px]">
        <thead>
          <tr className="border-b text-text-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={cn("py-1.5 font-medium", i === 0 ? "text-left" : "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="py-1.5 text-left font-normal">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className="py-1.5 text-right tabular-nums">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
