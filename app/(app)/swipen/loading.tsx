import { Skeleton } from "@/components/ui/skeleton";

/** Skelet van het hoofdscherm: header, kaart, actieregel en vier rijen tegels. */
export default function Loading() {
  return (
    <div className="safe-top-3 px-4" role="status" aria-label="Laden">
      <div className="flex h-7 items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-1 w-full rounded-full" />
      <Skeleton className="mt-3 h-[168px] w-full rounded-card-lg compact:h-[136px]" />
      <div className="mt-3 flex h-11 gap-2">
        <Skeleton className="h-11 flex-1 rounded-control" />
        <Skeleton className="h-11 w-24 rounded-control" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl compact:h-16" />
        ))}
      </div>
    </div>
  );
}
