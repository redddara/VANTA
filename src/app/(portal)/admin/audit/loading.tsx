import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuditLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-64" />
      </div>
      <TableSkeleton rows={8} columns={4} />
    </>
  );
}
