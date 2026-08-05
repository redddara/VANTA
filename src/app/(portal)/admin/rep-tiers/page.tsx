import type { Metadata } from "next";
import Link from "next/link";

import { RepTierManager } from "@/components/admin/rep-tier-manager";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { REP_TIER_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { RepTier } from "@/lib/types/app";

export const metadata: Metadata = { title: "Manage rep ladder" };

export default async function AdminRepTiersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("rep_tiers")
    .select(REP_TIER_SELECT)
    .order("level_order", { ascending: true })
    .returns<RepTier[]>();

  return (
    <>
      <PageHeader
        title="Manage Ladder"
        description="Edit tier labels, payouts and crafting unlocks. Changes apply to everyone on that tier immediately."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/rep-tiers">View as members see it</Link>
          </Button>
        }
      />
      <RepTierManager tiers={data ?? []} />
    </>
  );
}
