"use client";

import { useState, type PointerEvent } from "react";
import { formatDayShort, formatEuroWhole } from "@/lib/format";
import { niceTicks } from "@/lib/insights/charts";
import { compactEuro } from "./insight-copy";
import { ChartTooltip, useWidth } from "./chart-parts";

const LEFT = 40;
const RIGHT = 8;
const TOP = 8;
const PLOT = 140;
const AXIS = 22;

interface CumulativeChartProps {
  /** Datum ("YYYY-MM-DD") van elke dag van de periode. */
  days: string[];
  /** Opgeteld uitgegeven tot en met vandaag (korter dan `days`). */
  current: number[];
  /** Gemiddelde van vorige periodes op dezelfde dag, of null. */
  average: number[] | null;
}

function linePath(values: number[], x: (i: number) => number, y: (v: number) => number): string {
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
}

/**
 * Deze maand tot nu: opgeteld per dag, tegenover een gestippelde lijn van je gemiddelde.
 * Tik of sleep over de grafiek: een draadkruis zoekt de dichtstbijzijnde dag.
 */
export function CumulativeChart({ days, current, average }: CumulativeChartProps) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [selected, setSelected] = useState<number | null>(null);

  const length = days.length;
  const max = Math.max(1, ...current, ...(average ?? []));
  const ticks = niceTicks(max, 2);
  const top = ticks.at(-1) ?? max;
  const plotW = width - LEFT - RIGHT;
  const x = (i: number) => LEFT + (length > 1 ? (i / (length - 1)) * plotW : plotW / 2);
  const y = (v: number) => TOP + PLOT - (Math.max(0, v) / top) * PLOT;
  const last = current.length - 1;

  function pick(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - box.left) / Math.max(1, box.width);
    setSelected(Math.min(length - 1, Math.max(0, Math.round(ratio * (length - 1)))));
  }

  const area =
    current.length > 1 ? `${linePath(current, x, y)}L${x(last).toFixed(1)},${TOP + PLOT}L${x(0).toFixed(1)},${TOP + PLOT}Z` : "";
  const labels = [0, Math.floor((length - 1) / 2), length - 1].filter((v, i, all) => all.indexOf(v) === i);
  const endX = last >= 0 ? x(last) : 0;

  return (
    <div ref={ref} className="relative" aria-live="polite">
      {selected !== null && (
        <ChartTooltip
          x={x(selected)}
          width={width}
          title={`${formatDayShort(days[selected])} · dag ${selected + 1}`}
          rows={[
            ...(selected <= last ? [{ value: formatEuroWhole(current[selected]), label: "deze maand", color: "var(--chart-out)" }] : []),
            ...(average ? [{ value: formatEuroWhole(average[selected]), label: "gemiddeld", color: "var(--chart-ref)", dashed: true }] : []),
          ]}
        />
      )}
      <svg
        width={width}
        height={TOP + PLOT + AXIS}
        role="group"
        tabIndex={0}
        aria-label="Opgeteld uitgegeven per dag. Pijltjestoetsen kiezen een dag."
        className="block rounded-[8px] outline-none focus-visible:outline-2 focus-visible:outline-focus"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const step = e.key === "ArrowRight" ? 1 : -1;
            setSelected((cur) => Math.min(length - 1, Math.max(0, (cur ?? last) + (cur === null ? 0 : step))));
          } else if (e.key === "Escape") setSelected(null);
        }}
        onBlur={() => setSelected(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={LEFT}
              x2={width - RIGHT}
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
        {labels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={TOP + PLOT + 16}
            textAnchor={i === 0 ? "start" : i === length - 1 ? "end" : "middle"}
            className="fill-text-muted text-[11px]"
          >
            {formatDayShort(days[i])}
          </text>
        ))}

        {area && <path d={area} fill="var(--chart-out)" opacity={0.1} />}
        {average && (
          <path
            d={linePath(average, x, y)}
            fill="none"
            stroke="var(--chart-ref)"
            strokeWidth={2}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {current.length > 1 && (
          <path d={linePath(current, x, y)} fill="none" stroke="var(--chart-out)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {selected !== null && (
          <line x1={x(selected)} x2={x(selected)} y1={TOP} y2={TOP + PLOT} stroke="var(--border-strong)" strokeWidth={1} />
        )}
        {selected !== null && average && (
          <circle cx={x(selected)} cy={y(average[selected])} r={4} fill="var(--chart-ref)" stroke="var(--surface)" strokeWidth={2} />
        )}
        {last >= 0 && (
          <>
            <circle
              cx={x(selected !== null && selected <= last ? selected : last)}
              cy={y(current[selected !== null && selected <= last ? selected : last])}
              r={4}
              fill="var(--chart-out)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
            {selected === null && (
              <text
                x={endX > width * 0.7 ? endX - 8 : endX + 8}
                y={y(current[last]) - 8}
                textAnchor={endX > width * 0.7 ? "end" : "start"}
                className="fill-text text-[11px] font-semibold tabular-nums"
              >
                {formatEuroWhole(current[last])}
              </text>
            )}
          </>
        )}

        {/* Raakvlak over de hele grafiek; verticaal scrollen blijft werken. */}
        <rect
          x={LEFT}
          y={0}
          width={plotW}
          height={TOP + PLOT + AXIS}
          fill="transparent"
          style={{ touchAction: "pan-y" }}
          onPointerDown={pick}
          onPointerMove={(e) => {
            if (e.pointerType === "mouse" || e.buttons > 0) pick(e);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setSelected(null);
          }}
        />
      </svg>
    </div>
  );
}
