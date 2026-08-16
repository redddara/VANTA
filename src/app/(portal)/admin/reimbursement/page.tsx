import type { Metadata } from "next";
import Link from "next/link";

import { ReimbursementQueue } from "@/components/admin/reimbursement-queue";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { REIMBURSEMENT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { ReimbursementLogWithPeople } from "@/lib/types/app";

export const metadata: Metadata = { title: "Reimbursement queue" };
export const dynamic = "force-dynamic";

export default async function AdminReimbursementPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reimbursement_logs")
    .select(REIMBURSEMENT_SELECT)
    .eq("entry_type", "own_expense")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ReimbursementLogWithPeople[]>();

  return (
    <>
      <PageHeader
        title="Reimbursement Queue"
        description="Confirm or reject own-expense reimbursement requests. Org fund withdrawals are recorded on the logs page — they do not need reimbursement."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/reimbursement">Open logs</Link>
          </Button>
        }
      />
      <ReimbursementQueue entries={data ?? []} />
    </>
  );
}
