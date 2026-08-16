import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InventoryWorkspace } from "@/components/inventory/inventory-workspace";
import type { InventoryView } from "@/components/inventory/inventory-warehouse-nav";
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
export const dynamic = "force-dynamic";

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

  let initialView: InventoryView;

  if (requestedWarehouse) {
    initialView = requestedWarehouse.id;
  } else if (params.w != null && params.w !== "") {
    redirect(
      navWarehouses[0] != null
        ? `/inventory?w=${navWarehouses[0].id}`
        : "/dashboard",
    );
  } else if (admin) {
    initialView = "total";
  } else {
    redirect(
      navWarehouses[0] != null
        ? `/inventory?w=${navWarehouses[0].id}`
        : "/dashboard",
    );
  }

  const [
    itemsResult,
    stockResult,
    warehouseStockResult,
    movementsResult,
    members,
  ] = await Promise.all([
    supabase
      .from("inventory_items")
      .select(INVENTORY_ITEM_SELECT)
      .order("name")
      .returns<InventoryItem[]>(),
    admin
      ? supabase
          .from("inventory_stock")
          .select(INVENTORY_STOCK_SELECT)
          .order("item_name")
          .returns<InventoryStock[]>()
      : Promise.resolve({ data: [] as InventoryStock[] }),
    supabase
      .from("inventory_warehouse_stock")
      .select(INVENTORY_WAREHOUSE_STOCK_SELECT)
      .order("item_name")
      .returns<InventoryWarehouseStock[]>(),
    supabase
      .from("inventory_movements")
      .select(INVENTORY_MOVEMENT_SELECT)
      .order("created_at", { ascending: false })
      .limit(80)
      .returns<InventoryMovementWithPeople[]>(),
    getSelectableMembers(),
  ]);

  return (
    <InventoryWorkspace
      initialView={initialView}
      admin={admin}
      navWarehouses={navWarehouses}
      allWarehouses={warehouses as InventoryWarehouse[]}
      items={itemsResult.data ?? []}
      totalStock={stockResult.data ?? []}
      warehouseStock={warehouseStockResult.data ?? []}
      movements={movementsResult.data ?? []}
      members={members}
    />
  );
}
