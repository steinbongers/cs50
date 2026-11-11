import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";
import { formatEuroWhole, formatLongDate } from "@/lib/format";
import type { MonthLeft } from "@/lib/insights/fixed-month-server";
import { freeUntilLabel } from "./overview-copy";

const shell =
  "flex min-h-14 w-full items-center gap-3 rounded-card bg-surface px-4 py-3 text-left shadow-card transition-transform duration-100 active:scale-[0.98] motion-reduce:transition-none";

/** Kort, voor de kop van Swipen en als schermlezertekst: "€ 412 over". */
export function monthLeftShort(left: MonthLeft | null): string | null {
  if (!left || left.status !== "running") return null;
  return `${formatEuroWhole(left.amount)} over`;
}

/**
 * Nog over deze maand: vaste inkomsten min vaste kosten min wat je deze maand verder uitgaf.
 * Vóór je eerste hele maand: alleen wat er per maand vrij is. Zonder vaste maand: een uitnodiging
 * om hem in te stellen. Tik opent de lijst met vaste posten.
 */
export function MonthLeftCard({ left, canSetUp }: { left: MonthLeft | null; canSetUp: boolean }) {
  if (!left) {
    if (!canSetUp) return null;
    return (
      <Link href="/instellingen/vaste-maand" className={shell}>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-5 font-medium">Weet wat je vrij hebt</span>
          <span className="block text-[13px] leading-[18px] text-text-muted">Tik aan wat elke maand terugkomt</span>
        </span>
        <IconChevronRight size={18} className="shrink-0 text-text-muted" />
      </Link>
    );
  }

  const running = left.status === "running";
  const label = running ? freeUntilLabel(left.until).replace(/^Vrij/, "Nog over") : "Vrij per maand";
  const detail = running
    ? `${formatEuroWhole(left.fixedIn)} erin, ${formatEuroWhole(left.fixedOut)} vast eruit, ${formatEuroWhole(left.variable)} verder uitgegeven`
    : `Je eerste hele maand begint op ${formatLongDate(left.startsOn)}`;

  return (
    <Link href="/instellingen/vaste-maand" className={shell}>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-[18px] text-text-muted">{label}</span>
        <span className="block text-[22px] leading-7 font-semibold tabular-nums tracking-[-0.01em]">{formatEuroWhole(left.amount)}</span>
        <span className="block truncate text-[13px] leading-[18px] text-text-muted">{detail}</span>
      </span>
      <span className="sr-only">Bekijk je vaste maand</span>
      <IconChevronRight size={18} className="shrink-0 text-text-muted" />
    </Link>
  );
}
