import type { Metadata } from "next";

import { ReputationLedger } from "@/components/admin/reputation-ledger";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { REPUTATION_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { ReputationEntryWithPeople } from "@/lib/types/app";

export const metadata: Metadata = { title: "Rep ledger" };

export default async function AdminReputationPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reputation_entries")
    .select(REPUTATION_SELECT)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<ReputationEntryWithPeople[]>();

  return (
    <>
      <PageHeader
        title="Rep Ledger"
        description="Every reputation entry in the crew. Edits and voids are written to the audit log."
      />
      <ReputationLedger entries={data ?? []} />
    </>
  );
}
