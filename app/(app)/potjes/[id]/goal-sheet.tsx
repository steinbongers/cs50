"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { setBudget, setGoal } from "../actions";

type Mode = "budget" | "goal";

// Korte labels, zodat ze op 375 px niet worden afgekapt; de uitleg staat eronder.
const MODES = [
  { value: "budget", label: "Maandbudget" },
  { value: "goal", label: "Spaardoel" },
] as const;

const MODE_HINTS: Record<Mode, string> = {
  budget: "Maximaal per maand",
  goal: "Sparen voor een doel",
};

const AMOUNT_ERROR = "Vul een bedrag boven € 0 in.";

/** "150", "150,50" of "1.000,00" naar een getal; null als het geen bedrag is. */
export function parseEuroInput(raw: string): number | null {
  let text = raw.trim().replace(/€|\s/g, "");
  if (text === "") return null;
  // Komma is het decimaalteken; punten ervoor zijn duizendtallen.
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function formatInput(value: number | null): string {
  if (value === null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  monthlyBudget: number | null;
  goalAmount: number | null;
  /** Spaarpotje: alleen een spaardoel, geen maandbudget (sparen is geen uitgeven). */
  goalOnly?: boolean;
}

/** Sheet "Wat wil je bijhouden?": een maandbudget óf een spaardoel. Niets is vooraf gekozen. */
export function GoalSheet({ open, onClose, categoryId, monthlyBudget, goalAmount, goalOnly = false }: GoalSheetProps) {
  const initialMode: Mode | null = goalOnly || goalAmount !== null ? "goal" : monthlyBudget !== null ? "budget" : null;
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [value, setValue] = useState(formatInput(goalAmount ?? monthlyBudget));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();
  const errorId = useId();
  const hasAny = monthlyBudget !== null || goalAmount !== null;

  function close() {
    setMode(initialMode);
    setValue(formatInput(goalAmount ?? monthlyBudget));
    setError(null);
    onClose();
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else {
        setError(null);
        onClose();
      }
    });
  }

  function save() {
    if (!mode) return;
    const amount = parseEuroInput(value);
    if (amount === null || amount <= 0 || amount > 1_000_000) {
      setError(AMOUNT_ERROR);
      return;
    }
    run(() => (mode === "budget" ? setBudget(categoryId, amount) : setGoal(categoryId, amount)));
  }

  function clear() {
    setValue("");
    // Beide acties wissen budget én doel.
    run(() => (goalAmount !== null ? setGoal(categoryId, null) : setBudget(categoryId, null)));
  }

  return (
    <Sheet open={open} onClose={close} title={goalOnly ? "Spaardoel" : "Wat wil je bijhouden?"}>
      <div className="flex flex-col gap-4">
        {!goalOnly && (
          <Segmented
            options={MODES}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
            ariaLabel="Wat wil je bijhouden?"
          />
        )}
        {mode && !goalOnly && <p className="-mt-2 text-[13px] leading-[18px] text-text-muted">{MODE_HINTS[mode]}</p>}
        {mode && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-[15px] font-medium">
              {mode === "budget" ? "Hoeveel wil je hier per maand aan uitgeven?" : "Voor welk bedrag spaar je?"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-text-muted" aria-hidden>
                €
              </span>
              <Input
                id={inputId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={mode === "budget" ? "150" : "1.000"}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="pl-9 tabular-nums"
              />
            </div>
            {error && (
              <p id={errorId} className="text-[13px] leading-[18px] text-negative" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
        {!mode && error && (
          <p className="text-[13px] leading-[18px] text-negative" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button fullWidth onClick={save} disabled={!mode || isPending} loading={isPending}>
            Opslaan
          </Button>
          {hasAny && (
            <Button variant="secondary" fullWidth onClick={clear} disabled={isPending}>
              {goalAmount !== null ? "Geen doel meer" : "Geen budget meer"}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={close}>
            Toch niet
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
