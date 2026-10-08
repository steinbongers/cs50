import { categoryColorClasses } from "@/lib/categories/palette";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";

interface CategoryBadgeProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { box: "size-8 rounded-lg", icon: 16 },
  md: { box: "size-10 rounded-xl", icon: 20 },
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
