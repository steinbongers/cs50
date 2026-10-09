"use client";

import { useState } from "react";
import { formatEuroWhole } from "@/lib/format";
import { niceTicks } from "@/lib/insights/charts";
import { capitalize } from "@/components/overview/overview-copy";
import { WEEKDAYS_SHORT, compactEuro, weekdayName } from "./insight-copy";
import { ChartTooltip, barPath, useWidth } from "./chart-parts";

const LEFT = 36;
const TOP = 22;
const PLOT = 112;
const AXIS = 20;
const BAR_MAX = 24;

/**
 * Gemiddeld uitgegeven per weekdag, maandag eerst. Eén reeks in één kleur: de hoogte
 * vertelt het verhaal, niet de kleur. Alleen de hoogste staaf krijgt een label.
 */
export function WeekdayChart({ average, totals }: { average: number[]; totals: number[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(...average);
  const maxIndex = average.indexOf(max);
  const ticks = niceTicks(Math.max(1, max), 2);
  const top = ticks.at(-1) ?? max;
  const slot = (width - LEFT) / 7;
  const bar = Math.min(BAR_MAX, slot * 0.55);
  const y = (v: number) => TOP + PLOT - (Math.max(0, v) / top) * PLOT;

  return (
    <div ref={ref} className="relative" aria-live="polite">
      {selected !== null && (
        <ChartTooltip
          x={LEFT + slot * (selected + 0.5)}
          width={width}
          title={capitalize(weekdayName(selected))}
          rows={[
            { value: formatEuroWhole(average[selected]), label: "per dag", color: "var(--chart-out)" },
            { value: formatEuroWhole(totals[selected]), label: "in totaal" },
          ]}
        />
      )}
      <svg width={width} height={TOP + PLOT + AXIS} role="group" aria-label="Gemiddeld uitgegeven per weekdag" className="block">
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
        {average.map((value, i) => {
          const cx = LEFT + slot * (i + 0.5);
          const toggle = () => setSelected((cur) => (cur === i ? null : i));
          return (
            <g
              key={WEEKDAYS_SHORT[i]}
              role="button"
              tabIndex={0}
              aria-pressed={selected === i}
              aria-label={`${capitalize(weekdayName(i))}: gemiddeld ${formatEuroWhole(value)} per dag`}
              className="group cursor-pointer outline-none"
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }}
            >
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
              <path
                d={barPath(cx - bar / 2, y(value), bar, TOP + PLOT - y(value))}
                fill="var(--chart-out)"
                opacity={selected !== null && selected !== i ? 0.4 : 1}
                className="transition-opacity duration-150"
              />
              {i === maxIndex && max > 0 && (
                <text x={cx} y={y(value) - 6} textAnchor="middle" className="fill-text text-[11px] font-semibold tabular-nums">
                  {compactEuro(value)}
                </text>
              )}
              <text x={cx} y={TOP + PLOT + 15} textAnchor="middle" className="fill-text-muted text-[11px]">
                {WEEKDAYS_SHORT[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
