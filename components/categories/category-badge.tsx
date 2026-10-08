import { categoryColorClasses } from "@/lib/categories/palette";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  emoji: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8 text-base rounded-lg",
  md: "size-10 text-xl rounded-xl",
  lg: "size-14 text-3xl rounded-2xl",
};

/** Emoji op een zachte potjeskleur. */
export function CategoryBadge({ emoji, color, size = "md", className }: CategoryBadgeProps) {
  const classes = categoryColorClasses(color);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        sizeClasses[size],
        classes.bg,
        className,
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
