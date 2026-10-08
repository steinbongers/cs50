"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import { MAX_SPLIT_PERSONS, MIN_SPLIT_PERSONS, splitEqually } from "@/lib/transactions/split";
import { cn } from "@/lib/utils";

export interface SplitState {
  enabled: boolean;
  persons: number;
  method: "bank" | "other";
  names: string[];
  showNames: boolean;
  /** Getalveld voor meer dan zes personen. */
  customPersons: boolean;
}

export const EMPTY_SPLIT: SplitState = {
  enabled: false,
  persons: 2,
  method: "bank",
  names: [],
  showNames: false,
  customPersons: false,
};

interface SplitPanelProps {
  amountAbs: number;
  state: SplitState;
  onChange: (patch: Partial<SplitState>) => void;
  /** Eerder gebruikte namen, als suggesties (datalist) bij de naamvelden. */
  knownNames?: string[];
}

const QUICK_PERSONS = [2, 3, 4, 5, 6];

/**
 * "Ik krijg geld terug": met hoeveel personen was je, en hoe komt het terug?
 * Jouw deel gaat naar het potje; de rest naar Voorgeschoten of is direct geregeld.
 */
export function SplitPanel({ amountAbs, state, onChange, knownNames = [] }: SplitPanelProps) {
  const reduce = useReducedMotion();
  const namesListId = useId();
  const result = splitEqually(amountAbs, state.persons);
  const othersTotal = Math.round(result.otherShares.reduce((a, b) => a + b, 0) * 100) / 100;

  return (
    <div className="rounded-card bg-surface shadow-card">
      <button
        type="button"
        role="switch"
        aria-checked={state.enabled}
        onClick={() => onChange({ enabled: !state.enabled })}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left"
      >
        <span className="text-sm font-medium">Ik krijg geld terug</span>
        <span
          aria-hidden
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150",
            state.enabled ? "bg-primary" : "bg-border",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-150",
              state.enabled ? "translate-x-[1.125rem]" : "translate-x-0.5",
            )}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {state.enabled && (
          <motion.div
            key="split-body"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-4 pb-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Met hoeveel personen was je, jij meegeteld?</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PERSONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange({ persons: n, customPersons: false })}
                      aria-pressed={!state.customPersons && state.persons === n}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors duration-150",
                        !state.customPersons && state.persons === n
                          ? "bg-primary text-on-primary"
                          : "bg-surface-muted text-text hover:bg-border",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  {state.customPersons ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      aria-label="Aantal personen"
                      min={MIN_SPLIT_PERSONS}
                      max={MAX_SPLIT_PERSONS}
                      value={state.persons}
                      autoFocus
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isInteger(value) && value >= MIN_SPLIT_PERSONS && value <= MAX_SPLIT_PERSONS) {
                          onChange({ persons: value });
                        }
                      }}
                      className="h-11 w-16 rounded-full border bg-surface px-3 text-center text-sm font-semibold tabular-nums focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onChange({ customPersons: true, persons: Math.max(state.persons, 7) })}
                      className="flex h-11 items-center justify-center rounded-full bg-surface-muted px-3 text-sm font-medium text-text hover:bg-border"
                    >
                      Meer
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-text-muted">Hoe krijg je het terug?</p>
                <div className="grid grid-cols-2 gap-1 rounded-control bg-surface-muted p-1" role="radiogroup">
                  {(
                    [
                      { value: "bank", label: "Via mijn rekening" },
                      { value: "other", label: "Anders (WBW, contant)" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={state.method === option.value}
                      onClick={() => onChange({ method: option.value })}
                      className={cn(
                        "min-h-11 rounded-[0.625rem] px-2 text-xs font-medium transition-colors duration-150",
                        state.method === option.value ? "bg-surface text-text shadow-card" : "text-text-muted hover:text-text",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm">
                Jouw deel <strong className="tabular-nums">{formatEuro(result.ownShare)}</strong>
                <span className="text-text-muted"> · </span>
                {state.method === "bank" ? "terug te krijgen" : "voor de anderen"}{" "}
                <strong className="tabular-nums">{formatEuro(othersTotal)}</strong>
                <span className="text-text-muted">
                  {" "}
                  ({result.otherShares.length} × {formatEuro(result.otherShares[0] ?? 0)})
                </span>
              </p>

              {state.method === "bank" && (
                <div>
                  {state.showNames ? (
                    <div className="flex flex-col gap-1.5">
                      {knownNames.length > 0 && (
                        <datalist id={namesListId}>
                          {knownNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      )}
                      {result.otherShares.map((_, index) => (
                        <Input
                          key={index}
                          aria-label={`Naam persoon ${index + 1}`}
                          placeholder={`Persoon ${index + 1}`}
                          value={state.names[index] ?? ""}
                          maxLength={60}
                          list={knownNames.length > 0 ? namesListId : undefined}
                          className="h-11 text-sm"
                          onChange={(e) => {
                            const names = [...state.names];
                            names[index] = e.target.value;
                            onChange({ names });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onChange({ showNames: true })}
                      className="min-h-11 text-sm font-medium text-primary"
                    >
                      Namen toevoegen (optioneel)
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
