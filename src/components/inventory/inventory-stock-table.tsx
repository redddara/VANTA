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
import type { InventoryStock } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function InventoryStockTable({ rows }: { rows: InventoryStock[] }) {
  const [query, setQuery] = useState("");
  const [showRetired, setShowRetired] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((r) => (showRetired ? true : r.is_active))
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
  }, [rows, query, showRetired]);

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

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Package}
            title={query ? "No matching items" : "No stock yet"}
            description={
              query
                ? "Try a different search."
                : "Log an inbound movement to put something on the shelf."
            }
            className="py-10"
          />
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
              {visible.map((row) => (
                <TableRow key={row.item_id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.item_name}</span>
                      {!row.is_active ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Retired
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-right text-success">
                    {row.inbound_total}
                  </TableCell>
                  <TableCell className="tabular text-right text-warning">
                    {row.outbound_total}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-semibold",
                      Number(row.on_hand) === 0 && "text-muted-foreground",
                    )}
                  >
                    {row.on_hand}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
