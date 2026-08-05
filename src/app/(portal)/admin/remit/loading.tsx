import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function RemitQueueLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <Skeleton className="mb-4 h-9 w-72" />
      <TableSkeleton rows={6} columns={6} />
    </>
  );
}
