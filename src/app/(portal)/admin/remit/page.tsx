import type { Metadata } from "next";

import { RemitQueue } from "@/components/admin/remit-queue";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { REMIT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { RemitLogWithPeople } from "@/lib/types/app";

export const metadata: Metadata = { title: "Remit queue" };

export default async function AdminRemitPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Pending first so the queue opens on the work that needs doing.
  const { data } = await supabase
    .from("remit_logs")
    .select(REMIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<RemitLogWithPeople[]>();

  return (
    <>
      <PageHeader
        title="Remit Queue"
        description="Approve, reject, edit or void contributions. Only approved remit counts toward a member's total."
      />
      <RemitQueue entries={data ?? []} />
    </>
  );
}
