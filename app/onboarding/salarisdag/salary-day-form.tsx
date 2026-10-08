"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveSalaryDay } from "../actions";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function SalaryDayForm({ initialDay }: { initialDay: number | null }) {
  const [day, setDay] = useState<number | null>(initialDay);
  const [unknown, setUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveSalaryDay(unknown ? null : day);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4">
        <div className="grid grid-cols-7 gap-1.5 rounded-card bg-surface p-3 shadow-card" role="radiogroup" aria-label="Dag van de maand">
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
                  "flex aspect-square min-h-11 items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-colors duration-150",
                  selected ? "bg-primary text-on-primary" : "hover:bg-surface-muted",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-xs text-text-muted">
          Valt de dag in het weekend, dan rekenen we met de vrijdag ervoor.
        </p>

        <button
          type="button"
          role="checkbox"
          aria-checked={unknown}
          onClick={() => setUnknown((u) => !u)}
          className="mt-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-card bg-surface px-4 py-2 text-left shadow-card"
        >
          <span>
            <span className="block text-sm font-medium">Wisselt, of weet ik niet</span>
            <span className="block text-xs text-text-muted">Dan rekenen we gewoon met de kalendermaand.</span>
          </span>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
              unknown ? "border-primary bg-primary" : "border-border",
            )}
            aria-hidden
          />
        </button>
      </div>

      <div className="safe-bottom mt-auto px-4 pt-6 pb-5">
        {error && (
          <p className="mb-3 rounded-control bg-negative-soft px-4 py-3 text-sm text-negative" role="alert">
            {error}
          </p>
        )}
        <Button size="lg" fullWidth onClick={save} loading={isPending} disabled={!unknown && day === null}>
          Verder
        </Button>
      </div>
    </div>
  );
}
