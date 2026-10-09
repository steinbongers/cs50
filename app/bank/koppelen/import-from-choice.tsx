"use client";

import { Check } from "lucide-react";
import { IMPORT_FROM_OPTIONS, type ImportFrom } from "@/lib/bank/import-from";
import { cn } from "@/lib/utils";

/** Keuze vanaf wanneer kaartjes worden opgehaald. Eén keuze, als rustige lijst. */
export function ImportFromChoice({
  value,
  onChange,
  exclude = [],
}: {
  value: ImportFrom;
  onChange: (value: ImportFrom) => void;
  exclude?: ImportFrom[];
}) {
  const options = IMPORT_FROM_OPTIONS.filter((o) => !exclude.includes(o.value));
  return (
    <div role="radiogroup" aria-label="Kaartjes ophalen vanaf" className="divide-y overflow-hidden rounded-card bg-surface shadow-card">
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-surface-muted"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                checked ? "border-primary bg-primary text-on-primary" : "border-border-strong",
              )}
            >
              {checked && <Check size={12} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-5">{option.label}</span>
              {option.hint && <span className="block text-[13px] leading-[18px] text-text-muted">{option.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
