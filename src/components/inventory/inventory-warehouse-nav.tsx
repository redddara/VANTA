"use client";

import type { InventoryWarehouse } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export type InventoryView = "total" | number;

export function InventoryWarehouseNav({
  view,
  warehouses,
  showTotal,
  onSelect,
}: {
  view: InventoryView;
  warehouses: readonly InventoryWarehouse[];
  showTotal: boolean;
  onSelect: (view: InventoryView) => void;
}) {
  const tabs: { key: InventoryView; label: string }[] = [
    ...(showTotal ? [{ key: "total" as const, label: "Total" }] : []),
    ...warehouses.map((w) => ({
      key: w.id as InventoryView,
      label: w.name,
    })),
  ];

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Inventory warehouses"
      className="bg-secondary/60 mb-6 inline-flex h-9 max-w-full flex-wrap items-center rounded-lg p-0.75"
    >
      {tabs.map((tab) => {
        const active = tab.key === view;
        return (
          <button
            key={String(tab.key)}
            type="button"
            onClick={() => onSelect(tab.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
