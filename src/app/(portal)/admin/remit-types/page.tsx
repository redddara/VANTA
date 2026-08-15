import type { Metadata } from "next";

import { RemitTypesManager } from "@/components/admin/remit-types-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { INVENTORY_ITEM_SELECT, REMIT_TYPE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { InventoryItem, RemitType } from "@/lib/types/app";

export const metadata: Metadata = { title: "Remit types" };

export default async function AdminRemitTypesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [typesResult, itemsResult] = await Promise.all([
    supabase
      .from("remit_types")
      .select(REMIT_TYPE_SELECT)
      .order("name")
      .returns<RemitType[]>(),
    supabase
      .from("inventory_items")
      .select(INVENTORY_ITEM_SELECT)
      .order("name")
      .returns<InventoryItem[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="Remit Types"
        description="Catalog of what members can remit. Approving a remit adds that quantity to Warehouse 1 inventory automatically."
      />
      <RemitTypesManager
        types={typesResult.data ?? []}
        inventoryItems={itemsResult.data ?? []}
      />
    </>
  );
}
