import type { Metadata } from "next";

import { SetRepGrid } from "@/components/reputation/set-rep-grid";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { MEMBER_SUMMARY_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { MemberSummary } from "@/lib/types/app";

export const metadata: Metadata = { title: "Set reputation" };

export default async function SetReputationPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("member_summary")
    .select(MEMBER_SUMMARY_SELECT)
    .eq("is_active", true)
    .returns<MemberSummary[]>();

  const members = data ?? [];

  return (
    <>
      <PageHeader
        title="Set Reputation"
        description="Spreadsheet-style entry — tab across a row, hit Enter to save, move to the next member."
      />

      <Card className="py-4">
        <CardContent className="px-3 sm:px-6">
          <SetRepGrid members={members} />
        </CardContent>
      </Card>
    </>
  );
}
