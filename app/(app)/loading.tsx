import { Skeleton } from "@/components/ui/skeleton";

/**
 * Direct zichtbaar na een tik in het menu, terwijl de server de pagina maakt.
 * Zonder dit lijkt de app niet te reageren.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]" role="status" aria-label="Laden">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
