"use client";

import { useSyncExternalStore } from "react";
import { SunMoon } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";

type Theme = "system" | "light" | "dark";

const OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
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

/** Thema: volgt het systeem, of vast licht of donker. Bewaard op dit apparaat. Rij voor in een ListGroup. */
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
    <div className="group/row flex w-full items-start gap-3 pl-4">
      <span
        aria-hidden
        className="mt-[11px] flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-cat-indigo-soft text-cat-indigo"
      >
        <SunMoon size={18} strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-b border-border pt-3.5 pr-4 pb-3 group-last/row:border-b-0">
        <span aria-hidden className="text-[16px] text-text">
          Thema
        </span>
        <Segmented options={OPTIONS} value={theme} onChange={choose} ariaLabel="Thema" />
      </div>
    </div>
  );
}
