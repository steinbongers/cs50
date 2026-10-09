"use client";

import { useState } from "react";
import { formatEuroWhole } from "@/lib/format";
import { niceTicks } from "@/lib/insights/charts";
import { compactEuro } from "./insight-copy";
import { ChartTooltip, barPath, useWidth } from "./chart-parts";

export interface FlowPoint {
  /** "okt" */
  short: string;
  /** "oktober" of "oktober (tot nu toe)" */
  long: string;
  income: number;
  spent: number;
  net: number;
}

const LEFT = 40;
const TOP = 8;
const PLOT = 132;
/** Ruimte onder de basislijn: maand en wat er over is. */
const AXIS = 36;
const BAR_MAX = 14;
const GAP = 2;

function signed(amount: number): string {
  return Math.round(amount) > 0 ? `+${compactEuro(amount)}` : compactEuro(amount);
}

/**
 * Inkomsten en uitgaven per maand als staafparen op één as. Onder elke maand klein
 * wat er over bleef. Tik op een maand voor de cijfers.
 */
export function FlowChart({ points }: { points: FlowPoint[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(1, ...points.map((p) => Math.max(p.income, p.spent)));
  const ticks = niceTicks(max, 2);
  const top = ticks.at(-1) ?? max;
  const plotW = width - LEFT;
  const slot = plotW / Math.max(1, points.length);
  const bar = Math.max(4, Math.min(BAR_MAX, (slot - 16 - GAP) / 2));
  const y = (v: number) => TOP + PLOT - (Math.max(0, v) / top) * PLOT;
  const height = TOP + PLOT + AXIS;
  const focus = selected === null ? null : points[selected];

  return (
    <div ref={ref} className="relative" aria-live="polite">
      {focus && selected !== null && (
        <ChartTooltip
          x={LEFT + slot * (selected + 0.5)}
          width={width}
          title={focus.long}
          rows={[
            { value: formatEuroWhole(focus.income), label: "Inkomsten", color: "var(--chart-in)" },
            { value: formatEuroWhole(focus.spent), label: "Uitgaven", color: "var(--chart-out)" },
            {
              value: formatEuroWhole(Math.abs(focus.net)),
              label: Math.round(focus.net) >= 0 ? "over" : "meer uitgegeven",
            },
          ]}
        />
      )}
      <svg width={width} height={height} role="group" aria-label="Inkomsten en uitgaven per maand" className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={LEFT}
              x2={width}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "var(--border-strong)" : "var(--border)"}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text x={LEFT - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-text-muted text-[11px] tabular-nums">
              {compactEuro(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = LEFT + slot * (i + 0.5);
          const x1 = cx - bar - GAP / 2;
          const x2 = cx + GAP / 2;
          const dim = selected !== null && selected !== i;
          const toggle = () => setSelected((cur) => (cur === i ? null : i));
          return (
            <g
              key={p.long}
              role="button"
              tabIndex={0}
              aria-pressed={selected === i}
              aria-label={`${p.long}: inkomsten ${formatEuroWhole(p.income)}, uitgaven ${formatEuroWhole(p.spent)}`}
              className="group cursor-pointer outline-none"
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }}
            >
              {/* Raakvlak: de hele kolom, ook de as eronder. Gekozen of in focus: een zacht vlak. */}
              <rect
                x={LEFT + slot * i + 1}
                y={TOP}
                width={slot - 2}
                height={PLOT + AXIS}
                rx={8}
                fill={selected === i ? "var(--surface-muted)" : "transparent"}
                strokeWidth={2}
                className="stroke-transparent group-focus-visible:stroke-focus"
              />
              <g opacity={dim ? 0.4 : 1} className="transition-opacity duration-150">
                <path d={barPath(x1, y(p.income), bar, TOP + PLOT - y(p.income))} fill="var(--chart-in)" />
                <path d={barPath(x2, y(p.spent), bar, TOP + PLOT - y(p.spent))} fill="var(--chart-out)" />
              </g>
              <text x={cx} y={TOP + PLOT + 15} textAnchor="middle" className="fill-text-muted text-[11px]">
                {p.short}
              </text>
              <text x={cx} y={TOP + PLOT + 30} textAnchor="middle" className="fill-text text-[11px] font-medium tabular-nums">
                {signed(p.net)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
