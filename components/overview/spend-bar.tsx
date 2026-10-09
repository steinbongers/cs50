"use client";

import { useState } from "react";
import { isCategoryColor } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SpendSlice {
  id: string;
  name: string;
  color: string;
  amount: number;
}

/** De grootste vijf potjes krijgen een eigen stuk; de rest gaat samen als "Overige potjes". */
const MAX_SEGMENTS = 5;
const OTHER_ID = "__overige";
const OPEN_ID = "__open";

function fillFor(slice: SpendSlice): string {
  if (slice.id === OPEN_ID) return "var(--text-muted)";
  if (slice.id === OTHER_ID) return "var(--cat-grijs)";
  return `var(--cat-${isCategoryColor(slice.color) ? slice.color : "grijs"})`;
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  const p = (part / total) * 100;
  return p < 1 ? "<1%" : `${Math.round(p)}%`;
}

interface SpendBarProps {
  /** Uitgaven per potje in deze maand (alleen positieve bedragen tellen). */
  slices: SpendSlice[];
  /** Uitgaven op kaartjes die nog in geen potje zitten: een gearceerd stuk "Nog in te delen". */
  unsorted: number;
  /** Totaal uitgegeven (potjes plus nog in te delen, min geld terug zonder potje). */
  total: number;
  /** Maandnaam, voor de kop en de schermlezer. */
  label: string;
}

/**
 * Groot bedrag met één dunne balk eronder: per potje een stuk, grootste eerst (besluit van
 * Stein, in plaats van de ring). Tik op een stuk of op een naam eronder en je ziet dat potje
 * met zijn bedrag en aandeel; nog een keer tikken zet het totaal terug. Kleur is nooit het
 * enige kenmerk: elke naam staat eronder, en "nog in te delen" is gearceerd.
 */
export function SpendBar({ slices, unsorted, total, label }: SpendBarProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const sorted = slices.filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
  const segments: SpendSlice[] = sorted.slice(0, MAX_SEGMENTS);
  const tail = sorted.slice(MAX_SEGMENTS);
  if (tail.length > 0) {
    segments.push({ id: OTHER_ID, name: "Overige potjes", color: "grijs", amount: tail.reduce((a, s) => a + s.amount, 0) });
  }
  if (unsorted > 0) segments.push({ id: OPEN_ID, name: "Nog in te delen", color: "grijs", amount: unsorted });

  const barTotal = segments.reduce((a, s) => a + s.amount, 0);
  const focus = segments.find((s) => s.id === selected) ?? null;
  const toggle = (id: string) => setSelected((current) => (current === id ? null : id));
  const summary = segments.map((s) => `${s.name} ${formatEuroWhole(s.amount)}`).join(", ");

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="text-center" aria-live="polite">
        {focus ? (
          <>
            <p className="text-[13px] text-text-muted">{focus.name}</p>
            <p className="text-[36px] leading-[42px] font-semibold tabular-nums tracking-[-0.02em]">
              {formatEuroWhole(focus.amount)}
            </p>
            <p className="text-[13px] text-text-muted tabular-nums">
              {percent(focus.amount, barTotal)} van {formatEuroWhole(barTotal)}
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] text-text-muted">Uitgegeven in {label.toLowerCase()}</p>
            <p className="text-[36px] leading-[42px] font-semibold tabular-nums tracking-[-0.02em]">{formatEuroWhole(total)}</p>
            <p className="invisible text-[13px]" aria-hidden>
              &nbsp;
            </p>
          </>
        )}
      </div>

      {barTotal > 0 && (
        <>
          {/* Hoge tikvlakken (44 px) rond een balk van 12 px; 2 px ruimte tussen de stukken. */}
          <div className="flex w-full gap-[2px]" role="group" aria-label={`Uitgaven per potje in ${label}: ${summary}`}>
            {segments.map((slice, i) => {
              const dimmed = selected !== null && selected !== slice.id;
              return (
                <button
                  key={slice.id}
                  type="button"
                  onClick={() => toggle(slice.id)}
                  aria-pressed={selected === slice.id}
                  aria-label={`${slice.name}: ${formatEuroWhole(slice.amount)}, ${percent(slice.amount, barTotal)}`}
                  className="flex h-11 min-w-[6px] items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{ flexGrow: slice.amount, flexBasis: 0 }}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "block h-3 w-full transition-opacity duration-150",
                      i === 0 && "rounded-l-full",
                      i === segments.length - 1 && "rounded-r-full",
                      dimmed && "opacity-30",
                    )}
                    style={
                      slice.id === OPEN_ID
                        ? {
                            backgroundImage:
                              "repeating-linear-gradient(135deg, var(--text-muted) 0 2px, transparent 2px 5px)",
                            boxShadow: "inset 0 0 0 1px var(--text-muted)",
                          }
                        : { backgroundColor: fillFor(slice) }
                    }
                  />
                </button>
              );
            })}
          </div>

          <ul className="-mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {segments.map((slice) => (
              <li key={slice.id}>
                <button
                  type="button"
                  onClick={() => toggle(slice.id)}
                  aria-hidden
                  tabIndex={-1}
                  className={cn(
                    "inline-flex min-h-7 items-center gap-1.5 text-[13px] text-text-muted transition-opacity duration-150",
                    selected !== null && selected !== slice.id && "opacity-50",
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={
                      slice.id === OPEN_ID
                        ? { boxShadow: "inset 0 0 0 1.5px var(--text-muted)" }
                        : { backgroundColor: fillFor(slice) }
                    }
                  />
                  <span>{slice.name}</span>
                  <span className="tabular-nums">{percent(slice.amount, barTotal)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
