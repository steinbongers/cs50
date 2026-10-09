import { BudgetBar } from "@/components/ui/budget-bar";
import { formatEuroWhole } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PotjeProgressProps {
  amount: number;
  /** Budget voor deze maand, of null. */
  budget: number | null;
  /** Uitgegeven in dit potje de maand ervoor (0 = geen streepje). */
  lastMonth: number;
  over?: boolean;
  colorClass: string;
  className?: string;
}

/**
 * Dunne balk per potje met een streepje op het bedrag van vorige maand.
 * Met budget loopt de balk tot het budget; zonder budget tot het grootste van
 * deze en vorige maand. Zonder budget en zonder vorige maand: niets.
 */
export function PotjeProgress({ amount, budget, lastMonth, over = false, colorClass, className }: PotjeProgressProps) {
  const scale = budget !== null && budget > 0 ? budget : Math.max(amount, lastMonth);
  if (scale <= 0 || (budget === null && lastMonth <= 0)) return null;
  const marker = lastMonth > 0 ? Math.min(1, lastMonth / scale) : null;

  return (
    <span className={cn("relative block", className)}>
      <BudgetBar ratio={amount / scale} over={over} colorClass={colorClass} />
      {marker !== null && (
        <>
          {/* Iets hoger dan de balk, in de gedempte tekstkleur: zichtbaar in licht en donker, niet schreeuwerig. */}
          <span
            aria-hidden
            className="absolute top-1/2 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-muted"
            style={{ left: `${marker * 100}%` }}
          />
          <span className="sr-only">Vorige maand {formatEuroWhole(lastMonth)}</span>
        </>
      )}
    </span>
  );
}
