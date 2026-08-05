import type { Metadata } from "next";

import { MembersTable } from "@/components/admin/members-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { MEMBER_SUMMARY_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { MemberSummary } from "@/lib/types/app";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("member_summary")
    .select(MEMBER_SUMMARY_SELECT)
    .returns<MemberSummary[]>();

  return (
    <>
      <PageHeader
        title="Members"
        description="Set portal roles, crew ranks and active status. Every change is written to the audit log."
      />
      <MembersTable members={data ?? []} currentUserId={profile.id} />
    </>
  );
}
