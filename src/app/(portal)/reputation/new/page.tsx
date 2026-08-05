import type { Metadata } from "next";

import { SetRepGrid } from "@/components/reputation/set-reputation-grid";
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

  const members = Array.isArray(data) ? data : [];

  return (
    <>
      <PageHeader
        title="Set Reputation"
        description="Pick Hacker and/or Driver, house type, launder and store from the lists. Type ATM salary by hand, then Save."
      />

      <Card className="py-4">
        <CardContent className="px-3 sm:px-6">
          <SetRepGrid members={members} />
        </CardContent>
      </Card>
    </>
  );
}
