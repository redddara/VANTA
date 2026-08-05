import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { SetTierForm } from "@/components/reputation/set-tier-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { getSelectableMembers } from "@/lib/members";
import { MEMBER_SUMMARY_SELECT, REP_TIER_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { MemberSummary, RepTier } from "@/lib/types/app";

export const metadata: Metadata = { title: "Set reputation tier" };

export default async function SetReputationTierPage() {
  await requireStaff();
  const supabase = await createClient();

  const [members, tiersResult, summariesResult] = await Promise.all([
    getSelectableMembers(),
    supabase
      .from("rep_tiers")
      .select(REP_TIER_SELECT)
      .order("level_order", { ascending: true })
      .returns<RepTier[]>(),
    supabase
      .from("member_summary")
      .select(MEMBER_SUMMARY_SELECT)
      .eq("is_active", true)
      .returns<MemberSummary[]>(),
  ]);

  const tiers = tiersResult.data ?? [];
  const currentByMember = Object.fromEntries(
    (summariesResult.data ?? []).map((m) => [m.id, m.current_tier_id]),
  );

  return (
    <>
      <PageHeader
        title="Set Reputation Tier"
        description="Place a member on the job ladder. There is no points score — only their current tier."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/rep-tiers">View ladder</Link>
          </Button>
        }
      />

      {tiers.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            icon={Layers}
            title="No tiers configured"
            description="An admin needs to build the ladder before anyone can be placed on it."
            action={
              <Button asChild size="sm">
                <Link href="/admin/rep-tiers">Manage ladder</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="py-6">
          <CardContent>
            <SetTierForm
              members={members}
              tiers={tiers}
              currentByMember={currentByMember}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
