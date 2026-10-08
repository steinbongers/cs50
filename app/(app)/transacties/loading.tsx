import { Skeleton } from "@/components/ui/skeleton";

/** Alle transacties laden: kop, zoekveld, chips en acht rijen. */
export default function Loading() {
  return (
    <div className="safe-top" role="status" aria-label="Transacties laden">
      <div className="flex items-center gap-1 px-4 pt-2">
        <Skeleton className="-ml-2 size-11 rounded-full!" />
        <Skeleton className="h-7 w-44" />
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3">
        <Skeleton className="h-11 w-full rounded-control!" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full!" />
          ))}
        </div>
      </div>
      <div className="px-4 pt-4">
        <Skeleton className="mb-1.5 h-4 w-36" />
        <div className="flex flex-col gap-px overflow-hidden rounded-card">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none!" />
          ))}
        </div>
      </div>
    </div>
  );
}
