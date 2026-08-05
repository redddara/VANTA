import type { Metadata } from "next";
import Link from "next/link";

import { ComplianceTable } from "@/components/remit/compliance-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { WEEKLY_COMPLIANCE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { WeeklyCompliance } from "@/lib/types/app";

export const metadata: Metadata = { title: "Weekly quota" };

export default async function RemitCompliancePage() {
  await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("member_weekly_compliance")
    .select(WEEKLY_COMPLIANCE_SELECT)
    .returns<WeeklyCompliance[]>();

  const rows = data ?? [];
  const weekStart = rows[0]?.week_start;

  return (
    <>
      <PageHeader
        title="Weekly Quota"
        description={
          weekStart
            ? `Who has met this week’s laundering quota (week of ${formatDate(weekStart)}). Every active member is tracked — no rank is exempt.`
            : "Who has met this week’s laundering quota. Every active member is tracked — no rank is exempt."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/remit">Remit queue</Link>
          </Button>
        }
      />

      <ComplianceTable rows={rows} />
    </>
  );
}
