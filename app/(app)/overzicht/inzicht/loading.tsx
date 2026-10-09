import { Skeleton } from "@/components/ui/skeleton";

/** Meer inzicht laden: kop en drie grafiekkaarten. */
export default function Loading() {
  return (
    <div className="safe-top-2" role="status" aria-label="Meer inzicht laden">
      <div className="flex min-h-11 items-center gap-2 px-4 pb-3">
        <Skeleton className="size-11 rounded-full!" />
        <Skeleton className="h-[34px] w-44" />
      </div>
      <div className="flex flex-col gap-4 px-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 w-full" />
        ))}
      </div>
    </div>
  );
}
