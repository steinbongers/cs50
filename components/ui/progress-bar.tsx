import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  className?: string;
  tone?: "primary" | "positive" | "accent";
  /** "md" is 8px hoog (standaard), "sm" is 4px (`h-1`), passend bij BudgetBar. */
  size?: "sm" | "md";
}

const toneClasses = {
  primary: "bg-primary",
  positive: "bg-positive",
  accent: "bg-accent",
};

export function ProgressBar({ value, max, label, className, tone = "primary", size = "md" }: ProgressBarProps) {
  const safeMax = Math.max(max, 1);
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(value, safeMax)}
      aria-label={label}
      className={cn(
        "w-full overflow-hidden rounded-full bg-surface-muted",
        size === "sm" ? "h-1" : "h-2",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-250 ease-out-soft",
          toneClasses[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
