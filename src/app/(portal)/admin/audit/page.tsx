import type { Metadata } from "next";

import { AuditTable } from "@/components/admin/audit-table";
import { PageHeader } from "@/components/shared/page-header";
import { fetchAuditPage } from "@/lib/actions/audit";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Audit log" };

type SearchParams = Promise<{ action?: string }>;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  const action = params.action?.trim() || "all";

  const page = await fetchAuditPage({
    action: action === "all" ? null : action,
    before: null,
  });

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Append-only history written by database triggers. Load older pages as needed — entries cannot be edited or deleted."
      />
      <AuditTable
        initialEntries={page.entries}
        initialCursor={page.nextCursor}
        initialAction={action}
      />
    </>
  );
}
