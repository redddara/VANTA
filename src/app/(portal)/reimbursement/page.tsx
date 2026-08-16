import type { Metadata } from "next";

import { ReimbursementForm } from "@/components/reimbursement/reimbursement-form";
import { ReimbursementList } from "@/components/reimbursement/reimbursement-list";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { REIMBURSEMENT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isStaff,
  type ReimbursementLogWithPeople,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Reimbursement logs" };
export const dynamic = "force-dynamic";

export default async function ReimbursementPage() {
  const { profile } = await requireSession();
  const staff = isStaff(profile.crew_rank);
  const supabase = await createClient();

  let query = supabase
    .from("reimbursement_logs")
    .select(REIMBURSEMENT_SELECT)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (!staff) {
    query = query.eq("logged_by", profile.id);
  }

  const { data } = await query.returns<ReimbursementLogWithPeople[]>();

  return (
    <>
      <PageHeader
        title="Reimbursement Logs"
        description="Log own-expense spends (optional reimbursement request) and org funds withdrawals. Paste a screenshot as proof when you have one."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="py-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">New log</CardTitle>
          </CardHeader>
          <CardContent>
            <ReimbursementForm
              canLogOrgWithdrawal={staff}
              selfId={profile.id}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">
              {staff ? "Recent logs" : "Your logs"}
            </CardTitle>
          </CardHeader>
          <div className="p-0">
            <ReimbursementList
              entries={data ?? []}
              currentUserId={profile.id}
              showLogger={staff}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
