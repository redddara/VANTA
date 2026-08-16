import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InventoryItemsManager } from "@/components/inventory/inventory-items-manager";
import { InventoryMovementForm } from "@/components/inventory/inventory-movement-form";
import { InventoryMovementsList } from "@/components/inventory/inventory-movements-list";
import { InventoryStockTable } from "@/components/inventory/inventory-stock-table";
import {
  InventoryWarehouseNav,
  type InventoryView,
} from "@/components/inventory/inventory-warehouse-nav";
import { InventoryWarehousesManager } from "@/components/inventory/inventory-warehouses-manager";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireInventoryAccess } from "@/lib/auth";
import { getSelectableMembers } from "@/lib/members";
import {
  INVENTORY_ITEM_SELECT,
  INVENTORY_MOVEMENT_SELECT,
  INVENTORY_STOCK_SELECT,
  INVENTORY_WAREHOUSE_STOCK_SELECT,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isAdmin,
  type InventoryItem,
  type InventoryMovementWithPeople,
  type InventoryStock,
  type InventoryWarehouse,
  type InventoryWarehouseStock,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Inventory" };

type SearchParams = Promise<{ w?: string }>;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile, warehouses } = await requireInventoryAccess();
  const supabase = await createClient();
  const admin = isAdmin(profile.crew_rank);
  const params = await searchParams;

  const navWarehouses = admin
    ? warehouses.filter((w) => w.is_active)
    : warehouses;

  const requestedId = Number(params.w);
  const requestedWarehouse =
    Number.isInteger(requestedId) && requestedId > 0
      ? navWarehouses.find((w) => w.id === requestedId) ??
        warehouses.find((w) => w.id === requestedId) ??
        null
      : null;

  let view: InventoryView;
  let activeWarehouse: InventoryWarehouse | null = null;

  if (requestedWarehouse) {
    view = requestedWarehouse.id;
    activeWarehouse = requestedWarehouse;
  } else if (params.w != null && params.w !== "") {
    redirect(
      navWarehouses[0] != null
        ? `/inventory?w=${navWarehouses[0].id}`
        : "/dashboard",
    );
  } else if (admin) {
    view = "total";
  } else {
    redirect(
      navWarehouses[0] != null
        ? `/inventory?w=${navWarehouses[0].id}`
        : "/dashboard",
    );
  }

  const itemsQuery = supabase
    .from("inventory_items")
    .select(INVENTORY_ITEM_SELECT)
    .order("name")
    .returns<InventoryItem[]>();

  const movementsBase = supabase
    .from("inventory_movements")
    .select(INVENTORY_MOVEMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(40);

  const [
    itemsResult,
    stockResult,
    allWarehouseStockResult,
    warehouseStockResult,
    movementsResult,
    members,
  ] = await Promise.all([
    itemsQuery,
    activeWarehouse
      ? Promise.resolve({ data: null as InventoryStock[] | null })
      : supabase
          .from("inventory_stock")
          .select(INVENTORY_STOCK_SELECT)
          .order("item_name")
          .returns<InventoryStock[]>(),
    activeWarehouse
      ? Promise.resolve({ data: null as InventoryWarehouseStock[] | null })
      : supabase
          .from("inventory_warehouse_stock")
          .select(INVENTORY_WAREHOUSE_STOCK_SELECT)
          .returns<InventoryWarehouseStock[]>(),
    activeWarehouse
      ? supabase
          .from("inventory_warehouse_stock")
          .select(INVENTORY_WAREHOUSE_STOCK_SELECT)
          .eq("warehouse", activeWarehouse.id)
          .order("item_name")
          .returns<InventoryWarehouseStock[]>()
      : Promise.resolve({ data: null as InventoryWarehouseStock[] | null }),
    activeWarehouse
      ? movementsBase
          .eq("warehouse", activeWarehouse.id)
          .returns<InventoryMovementWithPeople[]>()
      : movementsBase.returns<InventoryMovementWithPeople[]>(),
    getSelectableMembers(),
  ]);

  const items = itemsResult.data ?? [];
  const totalStock = stockResult.data ?? [];
  const allWarehouseStock = allWarehouseStockResult.data ?? [];
  const warehouseStock = warehouseStockResult.data ?? [];
  const movements = movementsResult.data ?? [];

  const title = activeWarehouse == null ? "Inventory" : activeWarehouse.name;
  const description =
    activeWarehouse == null
      ? "Crew-wide totals across every warehouse. Open a warehouse to log inbound or outbound."
      : `Stock and movements for ${activeWarehouse.name}. On-hand is inbound minus outbound at this site.`;

  return (
    <>
      <PageHeader title={title} description={description} />

      <InventoryWarehouseNav
        view={view}
        warehouses={navWarehouses}
        showTotal={admin}
      />

      <div className="mb-8">
        {activeWarehouse == null ? (
          <InventoryStockTable
            mode="total"
            rows={totalStock}
            warehouses={navWarehouses}
            warehouseStock={allWarehouseStock}
          />
        ) : (
          <InventoryStockTable mode="warehouse" rows={warehouseStock} />
        )}
      </div>

      {activeWarehouse != null ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card className="py-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Log movement</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryMovementForm
                items={items}
                stock={warehouseStock}
                members={members}
                warehouse={activeWarehouse}
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
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Recent movements (all warehouses)</CardTitle>
          </CardHeader>
          <InventoryMovementsList
            movements={movements}
            canVoid={admin}
            showWarehouse
            warehouseNames={Object.fromEntries(
              warehouses.map((w) => [w.id, w.name]),
            )}
          />
        </Card>
      )}

      {admin ? (
        <>
          <section className="mt-10">
            <div className="mb-4">
              <h2 className="font-display text-xl tracking-wide uppercase">
                Warehouses
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Add a warehouse when the crew gets a new property. Assign members
                to it under Admin → Members.
              </p>
            </div>
            <InventoryWarehousesManager warehouses={warehouses} />
          </section>

          <section className="mt-10">
            <div className="mb-4">
              <h2 className="font-display text-xl tracking-wide uppercase">
                Items
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Catalog of trackable stash items. Rename anytime — remits stay
                linked by id. Retire instead of deleting if they already have
                movements.
              </p>
            </div>
            <InventoryItemsManager items={items} />
          </section>
        </>
      ) : null}
    </>
  );
}
