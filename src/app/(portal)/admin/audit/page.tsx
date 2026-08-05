import type { Metadata } from "next";

import { AuditTable } from "@/components/admin/audit-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { AUDIT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntryWithActor } from "@/lib/types/app";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_log")
    .select(AUDIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<AuditLogEntryWithActor[]>();

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Written by database triggers, not by the app. Entries cannot be edited or deleted by anyone, including admins."
      />
      <AuditTable entries={data ?? []} />
    </>
  );
}
