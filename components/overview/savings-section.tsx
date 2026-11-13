import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Card } from "@/components/ui/card";
import type { CatLite } from "@/lib/insights/compute";
import { SAVINGS_SINCE, savingsStandText } from "./overview-copy";

export interface SavingsItem {
  cat: CatLite;
  /** Stand: alles erin min alles eruit, sinds het eerste kaartje in de app. */
  stand: number;
}

/**
 * Blok "Sparen" onder de potjes: per spaarpotje alleen naam en stand. Het doel, de balk en wat er
 * deze maand bij kwam of af ging staan in het potje-detail. Er is nog geen startsaldo, dus de
 * stand begint bij je eerste kaartje.
 */
export function SavingsSection({ items }: { items: SavingsItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="sparen" className="flex flex-col gap-2">
      <h2 id="sparen" className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-[17px] leading-[22px] font-semibold">Sparen</span>
        <span className="text-[13px] leading-[18px] text-text-muted">{SAVINGS_SINCE}</span>
      </h2>
      <Card padding="none">
        <ul className="divide-y">
          {items.map(({ cat, stand }) => (
            <li key={cat.id}>
              <Link
                href={`/potjes/${cat.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted"
              >
                <CategoryBadge icon={cat.icon} color={cat.color} size="row" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{cat.name}</span>
                  <span className="block text-[13px] leading-[18px] text-text-muted tabular-nums">{savingsStandText(stand)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
