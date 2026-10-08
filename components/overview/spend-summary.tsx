import { Card } from "@/components/ui/card";
import { formatEuro, formatEuroWhole } from "@/lib/format";
import type { Comparison } from "@/lib/insights/compute";

/** Uitgegeven deze periode, tegenover je gemiddelde op hetzelfde punt. */
export function SpendSummary({ comparison, periodLabel }: { comparison: Comparison; periodLabel: string }) {
  const { current, average, periodsUsed, daysElapsed } = comparison;
  const label = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);

  let line: string;
  let tone: "muted" | "positive" | "accent" = "muted";
  if (average === null) {
    line = "Na je eerste volle maand vergelijken we dit met je gemiddelde.";
  } else {
    const diff = Math.round((current - average) * 100) / 100;
    const basis = periodsUsed === 1 ? "op basis van 1 maand" : `op basis van ${periodsUsed} maanden`;
    if (Math.abs(diff) < 1) {
      line = `Precies je gemiddelde na ${daysElapsed} dagen (${basis}).`;
    } else if (diff < 0) {
      line = `${formatEuro(-diff)} minder dan normaal na ${daysElapsed} dagen (${basis}).`;
      tone = "positive";
    } else {
      line = `${formatEuro(diff)} meer dan normaal na ${daysElapsed} dagen (${basis}).`;
      tone = "accent";
    }
  }

  return (
    <Card padding="lg" className="flex flex-col gap-1">
      <p className="text-sm text-text-muted">Uitgegeven · {label}</p>
      <p className="text-4xl font-semibold tabular-nums tracking-tight">{formatEuroWhole(current)}</p>
      <p className={tone === "positive" ? "text-sm text-positive" : tone === "accent" ? "text-sm text-accent" : "text-sm text-text-muted"}>
        {line}
      </p>
    </Card>
  );
}
