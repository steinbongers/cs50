"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StepFooter } from "../steps";
import { submitSalaryDay } from "./actions";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const COLUMNS = 7;
/** Index van "Wisselt, of weet ik niet": de laatste keuze in dezelfde radiogroep, na dag 31. */
const UNKNOWN_INDEX = DAYS.length;

/** Volgende index bij een pijltjestoets: links/rechts per dag, omhoog/omlaag per week. */
function nextIndex(key: string, index: number): number | null {
  const count = DAYS.length + 1;
  switch (key) {
    case "ArrowRight":
      return (index + 1) % count;
    case "ArrowLeft":
      return (index - 1 + count) % count;
    case "ArrowDown":
      if (index === UNKNOWN_INDEX) return 0;
      return Math.min(index + COLUMNS, UNKNOWN_INDEX);
    case "ArrowUp":
      if (index === UNKNOWN_INDEX) return DAYS.length - 1;
      return index - COLUMNS >= 0 ? index - COLUMNS : UNKNOWN_INDEX;
    case "Home":
      return 0;
    case "End":
      return UNKNOWN_INDEX;
    default:
      return null;
  }
}

/** Kies zelf je salarisdag, of de kalendermaand. Er staat niets voorgeselecteerd. */
export function SalaryDayForm({ initialDay }: { initialDay: number | null }) {
  const [day, setDay] = useState<number | null>(initialDay);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Eén radiogroep: dag 1 t/m 31 en "Wisselt, of weet ik niet". Roving tabindex: alleen de
  // gekozen keuze (of, zonder keuze, de eerste) zit in de tabvolgorde.
  const selectedIndex = unknown ? UNKNOWN_INDEX : day !== null ? day - 1 : -1;
  const tabIndexFor = (index: number) => (index === (selectedIndex === -1 ? 0 : selectedIndex) ? 0 : -1);

  function select(index: number) {
    if (index === UNKNOWN_INDEX) {
      setUnknown(true);
    } else {
      setDay(DAYS[index]);
      setUnknown(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextIndex(e.key, index);
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    select(next);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await submitSalaryDay(unknown ? null : day);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4" role="radiogroup" aria-label="Salarisdag">
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d, i) => {
            const selected = selectedIndex === i;
            return (
              <button
                key={d}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Dag ${d}`}
                tabIndex={tabIndexFor(i)}
                onClick={() => select(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-full text-[15px] font-medium tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.96]",
                  selected ? "bg-primary text-on-primary" : "text-text hover:bg-surface-muted",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-[13px] leading-[18px] text-text-muted">
          Valt die dag in het weekend? Dan tellen we vanaf de vrijdag ervoor.
        </p>

        <button
          ref={(el) => {
            refs.current[UNKNOWN_INDEX] = el;
          }}
          type="button"
          role="radio"
          aria-checked={unknown}
          tabIndex={tabIndexFor(UNKNOWN_INDEX)}
          onClick={() => select(UNKNOWN_INDEX)}
          onKeyDown={(e) => onKeyDown(e, UNKNOWN_INDEX)}
          className="mt-5 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-card bg-surface px-4 py-2.5 text-left shadow-card"
        >
          <span>
            <span className="block text-[15px] font-medium">Wisselt, of weet ik niet</span>
            <span className="block text-[13px] leading-[18px] text-text-muted">Dan gewoon de kalendermaand.</span>
          </span>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
              unknown ? "border-primary bg-primary" : "border-border-strong",
            )}
            aria-hidden
          >
            {unknown && <span className="size-2 rounded-full bg-on-primary" />}
          </span>
        </button>
      </div>

      <StepFooter>
        {error && (
          <p className="mb-3 rounded-control bg-negative-soft px-4 py-3 text-[13px] leading-[18px] text-negative" role="alert">
            {error}
          </p>
        )}
        <Button size="lg" fullWidth onClick={save} loading={isPending} disabled={!unknown && day === null}>
          Verder
        </Button>
      </StepFooter>
    </div>
  );
}
