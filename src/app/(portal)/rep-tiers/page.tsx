import type { Metadata } from "next";
import Link from "next/link";

import { RepLadderTable } from "@/components/reputation/rep-ladder-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/types/app";
import { REP_TIER_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { RepTier } from "@/lib/types/app";

export const metadata: Metadata = { title: "Reputation ladder" };

export default async function RepTiersPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();

  const [{ data: tiers }, { data: ownRep }] = await Promise.all([
    supabase
      .from("rep_tiers")
      .select(REP_TIER_SELECT)
      .order("level_order", { ascending: true })
      .returns<RepTier[]>(),
    supabase
      .from("member_rep")
      .select("current_tier_id")
      .eq("member_id", profile.id)
      .maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        title="Reputation Ladder"
        description="Every tier’s payouts and crafting unlocks. Your current level is highlighted when you have one."
        actions={
          isAdmin(profile.crew_rank) ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/rep-tiers">Manage ladder</Link>
            </Button>
          ) : null
        }
      />

      <RepLadderTable
        tiers={tiers ?? []}
        highlightTierId={ownRep?.current_tier_id}
      />
    </>
  );
}
