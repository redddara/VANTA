import type { Metadata } from "next";

import { InventoryItemsManager } from "@/components/inventory/inventory-items-manager";
import { InventoryMovementForm } from "@/components/inventory/inventory-movement-form";
import { InventoryMovementsList } from "@/components/inventory/inventory-movements-list";
import { InventoryStockTable } from "@/components/inventory/inventory-stock-table";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { getSelectableMembers } from "@/lib/members";
import {
  INVENTORY_ITEM_SELECT,
  INVENTORY_MOVEMENT_SELECT,
  INVENTORY_STOCK_SELECT,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isAdmin,
  type InventoryItem,
  type InventoryMovementWithPeople,
  type InventoryStock,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();
  const admin = isAdmin(profile.crew_rank);

  const [itemsResult, stockResult, movementsResult, members] = await Promise.all([
    supabase
      .from("inventory_items")
      .select(INVENTORY_ITEM_SELECT)
      .order("name")
      .returns<InventoryItem[]>(),
    supabase
      .from("inventory_stock")
      .select(INVENTORY_STOCK_SELECT)
      .order("item_name")
      .returns<InventoryStock[]>(),
    supabase
      .from("inventory_movements")
      .select(INVENTORY_MOVEMENT_SELECT)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<InventoryMovementWithPeople[]>(),
    getSelectableMembers(),
  ]);

  const items = itemsResult.data ?? [];
  const stock = stockResult.data ?? [];
  const movements = movementsResult.data ?? [];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Track stash inbound and outbound. On-hand is inbound minus outbound."
      />

      <div className="mb-8">
        <InventoryStockTable rows={stock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="py-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Log movement</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryMovementForm
              items={items}
              stock={stock}
              members={members}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Recent movements</CardTitle>
          </CardHeader>
          <InventoryMovementsList movements={movements} canVoid={admin} />
        </Card>
      </div>

      {admin ? (
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="font-display text-xl tracking-wide uppercase">
              Items
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Catalog of trackable stash items. Retire instead of deleting if
              they already have movements.
            </p>
          </div>
          <InventoryItemsManager items={items} />
        </section>
      ) : null}
    </>
  );
}
