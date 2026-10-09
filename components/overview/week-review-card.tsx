"use client";

import { useSyncExternalStore } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Card } from "@/components/ui/card";
import { IconClose } from "@/components/ui/icons";
import { formatDayShort, formatEuroWhole } from "@/lib/format";
import { weekDiffText } from "./overview-copy";

export interface WeekReviewItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  previous: number;
}

/** Per apparaat: voor welke week (maandag) de terugblik is weggeklikt. */
const STORAGE_KEY = "week-review-dismissed";
const listeners = new Set<() => void>();
/** Zonder opslag (privévenster) blijft de kaart in elk geval tot de volgende keer laden weg. */
let dismissedInMemory: string | null = null;

function readDismissed(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? dismissedInMemory;
  } catch {
    return dismissedInMemory;
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

/** Weekterugblik op zondag en maandag: de drie grootste potjes en het verschil met de week ervoor. */
export function WeekReviewCard({ weekStartISO, weekEndISO, items }: { weekStartISO: string; weekEndISO: string; items: WeekReviewItem[] }) {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => null);
  if (dismissed === weekStartISO || items.length === 0) return null;

  function dismiss() {
    dismissedInMemory = weekStartISO;
    try {
      localStorage.setItem(STORAGE_KEY, weekStartISO);
    } catch {
      // geen opslag beschikbaar
    }
    listeners.forEach((l) => l());
  }

  return (
    <Card padding="none" aria-labelledby="week-review-title" role="region">
      <div className="flex items-start gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <h2 id="week-review-title" className="text-[15px] font-semibold">
            Je week in potjes
          </h2>
          <p className="text-[13px] leading-[18px] text-text-muted">
            {formatDayShort(weekStartISO)} – {formatDayShort(weekEndISO)}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Weekterugblik verbergen"
          className="-mt-1.5 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted"
        >
          <IconClose size={20} />
        </button>
      </div>
      <ul className="flex flex-col px-4 pt-1 pb-3">
        {items.map((item) => (
          <li key={item.id} className="flex min-h-12 items-center gap-3 py-1.5">
            <CategoryBadge icon={item.icon} color={item.color} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{item.name}</span>
              <span className="block text-[13px] leading-[18px] text-text-muted tabular-nums">{weekDiffText(item.spent, item.previous)}</span>
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatEuroWhole(item.spent)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
