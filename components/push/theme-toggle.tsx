"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";

const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "system", label: "Systeem" },
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
];

const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Thema: volgt het systeem, of vast licht/donker. Bewaard op dit apparaat. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  function choose(next: Theme) {
    try {
      if (next === "system") {
        localStorage.removeItem("theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("theme", next);
        document.documentElement.setAttribute("data-theme", next);
      }
    } catch {
      // geen opslag beschikbaar
    }
    listeners.forEach((listener) => listener());
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium">Thema</p>
      <div className="grid grid-cols-3 gap-1 rounded-control bg-surface-muted p-1" role="radiogroup" aria-label="Thema">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            onClick={() => choose(option.value)}
            className={cn(
              "min-h-10 rounded-[0.625rem] text-sm font-medium transition-colors duration-150",
              theme === option.value ? "bg-surface text-text shadow-card" : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
