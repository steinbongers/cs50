"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  /** De gekozen waarde. Mag leeg zijn: dan is er niets gekozen (we kiezen nooit voor de gebruiker). */
  value: T | null | undefined;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Gesegmenteerde keuze (bijvoorbeeld systeem, licht, donker).
 * Gedraagt zich als radiogroep: pijltjestoetsen verplaatsen en kiezen.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = options.findIndex((o) => o.value === value);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(options[next].value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid h-11 gap-1 rounded-control bg-surface-muted p-1", className)}
      style={{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }}
    >
      {options.map((option, i) => {
        const active = i === activeIndex;
        // Zonder keuze is het eerste segment bereikbaar met Tab.
        const focusable = active || (activeIndex === -1 && i === 0);
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={focusable ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              // Het after-vlak vergroot het tikdoel tot de volle 44px hoogte van de balk.
              "relative truncate rounded-[10px] px-2 text-[15px] font-medium",
              "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
              "transition-[background-color,color,box-shadow] duration-200 ease-out-soft",
              active ? "bg-surface text-text shadow-card" : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
