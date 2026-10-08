import { Flame } from "lucide-react";

/** Dagstreak als getal met vlammetje. Verschijnt pas vanaf één dag. */
export function StreakChip({ days }: { days: number; todayDone?: boolean }) {
  if (days <= 0) return null;
  const label = `${days} ${days === 1 ? "dag" : "dagen"} op rij alles in een potje`;
  return (
    <span
      className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[13px] font-semibold tabular-nums text-accent"
      title={label}
    >
      <Flame size={14} aria-hidden />
      <span aria-hidden>{days}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
