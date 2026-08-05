import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-56" />
      </div>
      <TableSkeleton rows={8} columns={6} />
    </>
  );
}
