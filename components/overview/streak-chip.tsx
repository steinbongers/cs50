import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dagstreak als getal met vlammetje. Verschijnt pas vanaf één dag. */
export function StreakChip({ days, todayDone }: { days: number; todayDone: boolean }) {
  if (days <= 0) return null;
  return (
    <span
      className={cn(
        "flex h-9 items-center gap-1 rounded-full px-2.5 text-sm font-semibold tabular-nums",
        todayDone ? "bg-accent-soft text-accent" : "bg-surface-muted text-text-muted",
      )}
      title={`${days} ${days === 1 ? "dag" : "dagen"} op rij alles in een potje`}
    >
      <Flame size={16} aria-hidden />
      {days}
      <span className="sr-only"> {days === 1 ? "dag" : "dagen"} op rij alles in een potje</span>
    </span>
  );
}
