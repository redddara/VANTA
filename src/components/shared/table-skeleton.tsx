import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="flex items-center gap-4 border-b px-3 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-3"
            style={{ width: index === 0 ? "28%" : `${60 / columns}%` }}
          />
        ))}
      </div>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="border-border/60 flex items-center gap-4 border-b px-3 py-4 last:border-0"
        >
          <div className="flex w-[28%] items-center gap-2.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 w-full max-w-28" />
          </div>
          {Array.from({ length: columns - 1 }).map((_, cellIndex) => (
            <Skeleton
              key={cellIndex}
              className="h-3.5"
              style={{ width: `${60 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 sm:mb-8">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-3 h-3.5 w-full max-w-md" />
    </div>
  );
}
