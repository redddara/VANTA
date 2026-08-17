import type { Metadata } from "next";

import { MembersTable } from "@/components/admin/members-table";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import {
  INVENTORY_WAREHOUSE_ACCESS_SELECT,
  INVENTORY_WAREHOUSE_SELECT,
  MEMBER_SUMMARY_SELECT,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isKingpin,
  type InventoryWarehouse,
  type MemberSummary,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Members" };

export default async function AdminMembersPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [membersResult, accessResult, warehousesResult, approversResult] =
    await Promise.all([
      supabase
        .from("member_summary")
        .select(MEMBER_SUMMARY_SELECT)
        .returns<MemberSummary[]>(),
      supabase
        .from("inventory_warehouse_access")
        .select(INVENTORY_WAREHOUSE_ACCESS_SELECT),
      supabase
        .from("inventory_warehouses")
        .select(INVENTORY_WAREHOUSE_SELECT)
        .order("sort_order")
        .order("id")
        .returns<InventoryWarehouse[]>(),
      supabase.from("reimbursement_approvers").select("member_id"),
    ]);

  const warehousesByMember: Record<string, number[]> = {};
  for (const row of accessResult.data ?? []) {
    const list = warehousesByMember[row.member_id] ?? [];
    list.push(row.warehouse);
    warehousesByMember[row.member_id] = list;
  }
  for (const id of Object.keys(warehousesByMember)) {
    warehousesByMember[id].sort((a, b) => a - b);
  }

  const reimbursementApproverIds = new Set(
    (approversResult.data ?? []).map((row) => row.member_id),
  );

  return (
    <>
      <PageHeader
        title="Members"
        description={
          isKingpin(profile.crew_rank)
            ? "Set crew ranks, active status, warehouse access, reimbursement approvers, in-game names, and Hacking Practice access. Every change is written to the audit log."
            : "Set crew ranks, active status, and warehouse access. Every change is written to the audit log."
        }
      />
      <MembersTable
        members={membersResult.data ?? []}
        currentUserId={profile.id}
        canRename={isKingpin(profile.crew_rank)}
        canGrantHacking={isKingpin(profile.crew_rank)}
        canGrantReimbursementApprover={isKingpin(profile.crew_rank)}
        warehouseCatalog={warehousesResult.data ?? []}
        warehousesByMember={warehousesByMember}
        reimbursementApproverIds={reimbursementApproverIds}
      />
    </>
  );
}
