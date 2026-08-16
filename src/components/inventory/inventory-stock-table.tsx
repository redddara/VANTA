"use client";

import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  InventoryStock,
  InventoryWarehouse,
  InventoryWarehouseStock,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

type TotalProps = {
  mode: "total";
  rows: InventoryStock[];
  warehouses: InventoryWarehouse[];
  warehouseStock: InventoryWarehouseStock[];
};

type WarehouseProps = {
  mode: "warehouse";
  rows: InventoryWarehouseStock[];
};

export function InventoryStockTable(props: TotalProps | WarehouseProps) {
  const [query, setQuery] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const rows = props.rows;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((r) => (showRetired ? true : r.is_active))
      .filter((r) =>
        showEmpty
          ? true
          : Number(r.on_hand) !== 0 ||
            Number(r.inbound_total) !== 0 ||
            Number(r.outbound_total) !== 0,
      )
      .filter((r) =>
        needle ? r.item_name.toLowerCase().includes(needle) : true,
      )
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        if (Number(b.on_hand) !== Number(a.on_hand)) {
          return Number(b.on_hand) - Number(a.on_hand);
        }
        return a.item_name.localeCompare(b.item_name);
      });
  }, [rows, query, showRetired, showEmpty]);

  const onHandByItemWarehouse = useMemo(() => {
    if (props.mode !== "total") return new Map<string, number>();
    const map = new Map<string, number>();
    for (const row of props.warehouseStock) {
      map.set(`${row.item_id}:${row.warehouse}`, Number(row.on_hand));
    }
    return map;
  }, [props]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items"
            aria-label="Search inventory stock"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowEmpty((v) => !v)}
          aria-pressed={showEmpty}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            showEmpty
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {showEmpty ? "Hiding empty" : "Show empty"}
        </button>
        <button
          type="button"
          onClick={() => setShowRetired((v) => !v)}
          aria-pressed={showRetired}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            showRetired
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {showRetired ? "Hiding retired" : "Show retired"}
        </button>
      </div>

      <div className="bg-card overflow-x-auto rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Package}
            title={query ? "No matching items" : "No stock yet"}
            description={
              query
                ? "Try a different search."
                : props.mode === "total"
                  ? showEmpty
                    ? "Log inbound stock in a warehouse to put something on the shelf."
                    : "Nothing on hand yet. Turn on Show empty to see the full catalog."
                  : showEmpty
                    ? "Log an inbound movement to put something on the shelf."
                    : "Nothing on hand here. Turn on Show empty to see the full catalog."
            }
            className="py-10"
          />
        ) : props.mode === "total" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                {props.warehouses.map((warehouse) => (
                  <TableHead key={warehouse.id} className="text-right">
                    {warehouse.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(visible as InventoryStock[]).map((row) => (
                <TableRow key={row.item_id}>
                  <TableCell>
                    <ItemName name={row.item_name} active={row.is_active} />
                  </TableCell>
                  {props.warehouses.map((warehouse) => (
                    <QtyCell
                      key={warehouse.id}
                      value={
                        onHandByItemWarehouse.get(
                          `${row.item_id}:${warehouse.id}`,
                        ) ?? 0
                      }
                      muted
                    />
                  ))}
                  <QtyCell value={row.on_hand} emphasize />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">On hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(visible as InventoryWarehouseStock[]).map((row) => (
                <TableRow key={row.item_id}>
                  <TableCell>
                    <ItemName name={row.item_name} active={row.is_active} />
                  </TableCell>
                  <TableCell className="tabular text-right text-success">
                    {row.inbound_total}
                  </TableCell>
                  <TableCell className="tabular text-right text-warning">
                    {row.outbound_total}
                  </TableCell>
                  <QtyCell value={row.on_hand} emphasize />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}

function ItemName({ name, active }: { name: string; active: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-medium">{name}</span>
      {!active ? (
        <Badge variant="outline" className="text-muted-foreground">
          Retired
        </Badge>
      ) : null}
    </div>
  );
}

function QtyCell({
  value,
  muted,
  emphasize,
}: {
  value: number;
  muted?: boolean;
  emphasize?: boolean;
}) {
  const zero = Number(value) === 0;
  return (
    <TableCell
      className={cn(
        "tabular text-right",
        emphasize && "font-semibold",
        muted && !emphasize && "text-muted-foreground",
        zero && "text-muted-foreground",
      )}
    >
      {value}
    </TableCell>
  );
}
