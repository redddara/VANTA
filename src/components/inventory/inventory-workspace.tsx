"use client";

import { useMemo, useState } from "react";

import { InventoryItemsManager } from "@/components/inventory/inventory-items-manager";
import { InventoryMovementForm } from "@/components/inventory/inventory-movement-form";
import { InventoryMovementsList } from "@/components/inventory/inventory-movements-list";
import { InventoryStockTable } from "@/components/inventory/inventory-stock-table";
import {
  InventoryWarehouseNav,
  type InventoryView,
} from "@/components/inventory/inventory-warehouse-nav";
import { InventoryWarehousesManager } from "@/components/inventory/inventory-warehouses-manager";
import type { SelectableMember } from "@/components/shared/member-combobox";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  InventoryItem,
  InventoryMovementWithPeople,
  InventoryStock,
  InventoryWarehouse,
  InventoryWarehouseStock,
} from "@/lib/types/app";

export function InventoryWorkspace({
  initialView,
  admin,
  navWarehouses,
  allWarehouses,
  items,
  totalStock,
  warehouseStock,
  movements,
  members,
}: {
  initialView: InventoryView;
  admin: boolean;
  navWarehouses: InventoryWarehouse[];
  allWarehouses: InventoryWarehouse[];
  items: InventoryItem[];
  totalStock: InventoryStock[];
  warehouseStock: InventoryWarehouseStock[];
  movements: InventoryMovementWithPeople[];
  members: SelectableMember[];
}) {
  const [view, setView] = useState<InventoryView>(initialView);

  const activeWarehouse =
    view === "total"
      ? null
      : (navWarehouses.find((w) => w.id === view) ??
        allWarehouses.find((w) => w.id === view) ??
        null);

  const warehouseRows = useMemo(() => {
    if (activeWarehouse == null) return [];
    return warehouseStock
      .filter((row) => Number(row.warehouse) === activeWarehouse.id)
      .sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [activeWarehouse, warehouseStock]);

  const visibleMovements = useMemo(() => {
    if (activeWarehouse == null) return movements;
    return movements.filter(
      (m) => Number(m.warehouse) === activeWarehouse.id,
    );
  }, [activeWarehouse, movements]);

  const title = activeWarehouse == null ? "Inventory" : activeWarehouse.name;
  const description =
    activeWarehouse == null
      ? "Crew-wide totals across every warehouse. Open a warehouse to log inbound or outbound."
      : `Stock and movements for ${activeWarehouse.name}. On-hand is inbound minus outbound at this site.`;

  function selectView(next: InventoryView) {
    setView(next);
    const url =
      next === "total" ? "/inventory" : `/inventory?w=${next}`;
    window.history.replaceState(null, "", url);
  }

  return (
    <>
      <PageHeader title={title} description={description} />

      <InventoryWarehouseNav
        view={view}
        warehouses={navWarehouses}
        showTotal={admin}
        onSelect={selectView}
      />

      <div className="mb-8">
        {activeWarehouse == null ? (
          <InventoryStockTable
            mode="total"
            rows={totalStock}
            warehouses={navWarehouses}
            warehouseStock={warehouseStock}
          />
        ) : (
          <InventoryStockTable mode="warehouse" rows={warehouseRows} />
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
                key={activeWarehouse.id}
                items={items}
                stock={warehouseRows}
                members={members}
                warehouse={activeWarehouse}
              />
            </CardContent>
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-sm">Recent movements</CardTitle>
            </CardHeader>
            <InventoryMovementsList
              movements={visibleMovements}
              canVoid={admin}
            />
          </Card>
        </div>
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">
              Recent movements (all warehouses)
            </CardTitle>
          </CardHeader>
          <InventoryMovementsList
            movements={visibleMovements}
            canVoid={admin}
            showWarehouse
            warehouseNames={Object.fromEntries(
              allWarehouses.map((w) => [w.id, w.name]),
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
            <InventoryWarehousesManager warehouses={allWarehouses} />
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
