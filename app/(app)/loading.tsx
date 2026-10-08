import { Skeleton } from "@/components/ui/skeleton";

/**
 * Neutraal skelet voor de schermen binnen de app, direct zichtbaar na een tik in het menu.
 * Swipen heeft een eigen skelet (swipen/loading.tsx).
 */
export default function Loading() {
  return (
    <div className="safe-top-4 flex flex-col gap-6 px-4" role="status" aria-label="Laden">
      <Skeleton className="h-8 w-40 rounded-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
