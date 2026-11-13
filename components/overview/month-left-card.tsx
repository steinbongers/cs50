import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";
import { formatEuroWhole, formatLongDate } from "@/lib/format";
import type { MonthLeft } from "@/lib/insights/fixed-month-server";

const shell =
  "flex min-h-14 w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-card transition-transform duration-100 active:scale-[0.98] motion-reduce:transition-none";

/** Kort, voor de kop van Swipen en als schermlezertekst: "€ 412 over". */
export function monthLeftShort(left: MonthLeft | null): string | null {
  if (!left || left.status !== "running") return null;
  return `${formatEuroWhole(left.amount)} over`;
}

/**
 * Nog over deze maand: vaste inkomsten min vaste kosten min wat je deze maand verder uitgaf.
 * Vóór je eerste hele maand: wat er per maand over is. Zonder vaste maand: een uitnodiging
 * om hem in te stellen. Tik opent je vaste kosten en inkomsten.
 */
export function MonthLeftCard({ left, canSetUp }: { left: MonthLeft | null; canSetUp: boolean }) {
  if (!left) {
    if (!canSetUp) return null;
    return (
      <Link href="/instellingen/vaste-maand" className={shell}>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-medium">Zie wat je over hebt</span>
          <span className="block text-[13px] leading-[18px] text-text-muted">Kies je vaste kosten</span>
        </span>
        <IconChevronRight size={18} className="shrink-0 text-text-muted" />
      </Link>
    );
  }

  const running = left.status === "running";
  const label = running ? "Nog over" : "Over per maand";
  // Alleen vóór de eerste hele maand een regel eronder; daarna staat er één getal.
  const detail = running ? null : `Je maand begint op ${formatLongDate(left.startsOn)}`;

  return (
    <Link href="/instellingen/vaste-maand" className={shell}>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[18px] text-text-muted">{label}</span>
        <span className="block text-[22px] leading-7 font-semibold tabular-nums tracking-[-0.01em]">{formatEuroWhole(left.amount)}</span>
        {detail && <span className="block truncate text-[13px] leading-[18px] text-text-muted">{detail}</span>}
      </span>
      <span className="sr-only">Bekijk je vaste maand</span>
      <IconChevronRight size={18} className="shrink-0 text-text-muted" />
    </Link>
  );
}
