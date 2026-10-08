"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StepFooter } from "../steps";
import { submitSalaryDay } from "./actions";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Kies zelf je salarisdag, of de kalendermaand. Er staat niets voorgeselecteerd. */
export function SalaryDayForm({ initialDay }: { initialDay: number | null }) {
  const [day, setDay] = useState<number | null>(initialDay);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await submitSalaryDay(unknown ? null : day);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4">
        <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Dag van de maand">
          {DAYS.map((d) => {
            const selected = !unknown && day === d;
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setDay(d);
                  setUnknown(false);
                }}
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
          type="button"
          aria-pressed={unknown}
          onClick={() => setUnknown((u) => !u)}
          className="mt-5 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-card bg-surface px-4 py-2.5 text-left shadow-card"
        >
          <span>
            <span className="block text-[15px] font-medium">Wisselt, of weet ik niet</span>
            <span className="block text-[13px] leading-[18px] text-text-muted">Dan gewoon de kalendermaand.</span>
          </span>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
              unknown ? "border-primary bg-primary" : "border-border",
            )}
            aria-hidden
          >
            {unknown && <span className="size-2 rounded-full bg-on-primary" />}
          </span>
        </button>
      </div>

      <StepFooter>
        {error && (
          <p className="mb-3 rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
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
