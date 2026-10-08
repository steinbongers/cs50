import { categoryColorClasses } from "@/lib/categories/palette";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

interface CategoryBadgeProps {
  icon: string;
  color: string;
  /** sm 32 · rij 36 · md 40 · kop 44 · lg 56 */
  size?: "sm" | "row" | "md" | "header" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { box: "size-8 rounded-lg", icon: 16 },
  row: { box: "size-9 rounded-[10px]", icon: 18 },
  md: { box: "size-10 rounded-xl", icon: 20 },
  header: { box: "size-11 rounded-xl", icon: 22 },
  lg: { box: "size-14 rounded-2xl", icon: 28 },
};

/** Lijnicoon in de potjeskleur op een zacht kleurvlak. */
export function CategoryBadge({ icon, color, size = "md", className }: CategoryBadgeProps) {
  const colors = categoryColorClasses(color);
  const s = sizeClasses[size];
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center", s.box, colors.bg, colors.text, className)}
      aria-hidden
    >
      <CategoryIcon icon={icon} size={s.icon} />
    </span>
  );
}
