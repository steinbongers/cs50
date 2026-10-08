import { cn } from "@/lib/utils";

/** Rustig grijs vlak dat een stuk inhoud aankondigt terwijl de server antwoordt. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-card bg-border/70", className)} />;
}
