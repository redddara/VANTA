import type { Metadata } from "next";

import { RosterTable } from "@/components/roster/roster-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/auth";
import { MEMBER_SUMMARY_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { MemberSummary } from "@/lib/types/app";

export const metadata: Metadata = { title: "Roster" };

export default async function RosterPage() {
  await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("member_summary")
    .select(MEMBER_SUMMARY_SELECT)
    .eq("is_active", true)
    .returns<MemberSummary[]>();

  return (
    <>
      <PageHeader
        title="Crew Roster"
        description="Every active Vanta member, their rank and their standing."
      />
      <RosterTable members={data ?? []} />
    </>
  );
}
