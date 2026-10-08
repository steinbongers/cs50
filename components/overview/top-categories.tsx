import Link from "next/link";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Card } from "@/components/ui/card";
import { categoryColorClasses } from "@/lib/categories/palette";
import { formatEuroWhole } from "@/lib/format";
import type { CatLite } from "@/lib/insights/compute";
import { cn } from "@/lib/utils";

interface TopCategoriesProps {
  cats: CatLite[];
  spent: Map<string, number>;
  limit?: number;
}

/** De grootste potjes van deze periode als horizontale balken. */
export function TopCategories({ cats, spent, limit = 5 }: TopCategoriesProps) {
  const rows = cats
    .filter((c) => !c.isIncome && !c.systemKey)
    .map((c) => ({ category: c, value: spent.get(c.id) ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  if (rows.length === 0) return null;
  const max = rows[0].value;

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">Grootste potjes</p>
      <ul className="flex flex-col gap-3">
        {rows.map(({ category, value }) => {
          const colors = categoryColorClasses(category.color);
          return (
            <li key={category.id}>
              <Link href={`/potjes/${category.id}`} className="flex flex-col gap-1.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <CategoryBadge icon={category.icon} color={category.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatEuroWhole(value)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                  <div className={cn("h-full rounded-full", colors.solid)} style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
