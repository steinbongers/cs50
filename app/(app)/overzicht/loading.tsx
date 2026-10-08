import { Skeleton } from "@/components/ui/skeleton";

/** Overzicht laden: kopregel, maandtitel, ring van 200 en vijf rijen. */
export default function Loading() {
  return (
    <div className="safe-top" role="status" aria-label="Overzicht laden">
      <div className="mt-2 flex h-11 items-center justify-between px-4">
        <Skeleton className="h-8 w-14 rounded-full!" />
        <div className="flex gap-1">
          <Skeleton className="size-11 rounded-full!" />
          <Skeleton className="size-11 rounded-full!" />
        </div>
      </div>
      <div className="flex flex-col gap-6 px-4 pt-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[34px] w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="mx-auto size-[200px] rounded-full!" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
