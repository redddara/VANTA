import {
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/shared/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReputationLedgerLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <Skeleton className="mb-4 h-9 w-full max-w-sm" />
      <TableSkeleton rows={7} columns={5} />
    </>
  );
}
