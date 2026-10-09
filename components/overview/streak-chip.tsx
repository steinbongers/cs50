import { Flame, Snowflake } from "lucide-react";

/**
 * Dagstreak als getal met vlammetje. Verschijnt pas vanaf één dag.
 * Eén gemiste dag per week vangt de streak stilletjes op; dan staat er een sneeuwvlokje naast.
 */
export function StreakChip({ days, forgiven = false }: { days: number; forgiven?: boolean }) {
  if (days <= 0) return null;
  const base = `${days} ${days === 1 ? "dag" : "dagen"} op rij alles in een potje`;
  const label = forgiven ? `${base}. Eén dag overgeslagen, je reeks blijft gewoon staan.` : base;
  return (
    <span
      className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[13px] font-semibold tabular-nums text-accent-strong"
      title={label}
    >
      <Flame size={14} aria-hidden />
      <span aria-hidden>{days}</span>
      {forgiven && <Snowflake size={12} className="opacity-70" aria-hidden />}
      <span className="sr-only">{label}</span>
    </span>
  );
}
