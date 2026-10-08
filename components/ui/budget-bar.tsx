import { cn } from "@/lib/utils";

export interface BudgetBarProps {
  /** Uitgegeven gedeeld door budget. Wordt begrensd op 0 tot 1. */
  ratio: number;
  /** Over je budget: de vulling wordt amber (nooit rood). */
  over?: boolean;
  /** Kleur van de vulling, bijvoorbeeld `bg-cat-groen`. Standaard `bg-primary`. */
  colorClass?: string;
  className?: string;
}

/**
 * Dunne budgetbalk. Puur decoratief (aria-hidden): zet de stand als tekst ernaast,
 * bijvoorbeeld "€ 120 van € 200" of "over je budget".
 */
export function BudgetBar({ ratio, over = false, colorClass, className }: BudgetBarProps) {
  const safe = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return (
    <div aria-hidden className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width,background-color] duration-200 ease-out-soft",
          over ? "bg-accent" : (colorClass ?? "bg-primary"),
        )}
        style={{ width: `${safe * 100}%` }}
      />
    </div>
  );
}
