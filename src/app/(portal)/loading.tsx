import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/table-skeleton";

/** Soft fallback while a portal route streams in. */
export default function PortalLoading() {
  return (
    <div className="vanta-page-enter space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} columns={4} />
    </div>
  );
}
