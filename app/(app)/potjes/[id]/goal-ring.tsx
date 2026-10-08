import { cn } from "@/lib/utils";

const SIZE = 72;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Ring van 72 px (lijn 8) voor de spaardoelstand. Decoratief: de stand staat als tekst ernaast.
 * `colorClass` is de tekstklasse van de potjeskleur (de ring tekent met currentColor).
 */
export function GoalRing({ ratio, colorClass }: { ratio: number; colorClass: string }) {
  const safe = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-surface-muted" />
      {safe > 0 && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - safe)}
          className={cn("transition-[stroke-dashoffset] duration-200 ease-out-soft motion-reduce:transition-none", colorClass)}
        />
      )}
    </svg>
  );
}
