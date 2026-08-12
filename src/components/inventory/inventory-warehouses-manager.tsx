"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createInventoryWarehouse,
  deleteInventoryWarehouse,
  updateInventoryWarehouse,
} from "@/lib/actions/inventory";
import type { InventoryWarehouse } from "@/lib/types/app";

const Schema = z.object({
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

type Values = z.infer<typeof Schema>;

export function InventoryWarehousesManager({
  warehouses,
}: {
  warehouses: InventoryWarehouse[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<InventoryWarehouse | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<InventoryWarehouse | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteInventoryWarehouse(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus />
          Add warehouse
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {warehouses.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No warehouses"
            description="Add a site when the crew gets a new property."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.name}</TableCell>
                  <TableCell className="tabular text-right">
                    {warehouse.sort_order}
                  </TableCell>
                  <TableCell>
                    {warehouse.is_active ? (
                      <Badge variant="outline" className="text-success">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Retired
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(warehouse)}
                        aria-label={`Edit ${warehouse.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(warehouse)}
                        aria-label={`Delete ${warehouse.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <WarehouseDialog
        warehouse={editing}
        nextSortOrder={
          warehouses.reduce((max, w) => Math.max(max, w.sort_order), 0) + 1
        }
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this warehouse?"
        description={
          deleting
            ? `Remove “${deleting.name}”. Warehouses with movements cannot be deleted — retire them instead.`
            : ""
        }
        confirmLabel="Delete warehouse"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

function WarehouseDialog({
  warehouse,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  warehouse: InventoryWarehouse | "new" | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = warehouse != null;
  const isNew = warehouse === "new";

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    values:
      warehouse && warehouse !== "new"
        ? {
            name: warehouse.name,
            isActive: warehouse.is_active,
            sortOrder: warehouse.sort_order,
          }
        : { name: "", isActive: true, sortOrder: nextSortOrder },
  });

  async function onSubmit(values: Values) {
    if (isNew) {
      const result = await createInventoryWarehouse(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      onSaved();
      return;
    }

    if (!warehouse) {
      toast.error("Nothing to save.");
      return;
    }

    const result = await updateInventoryWarehouse({
      id: warehouse.id,
      name: values.name,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add warehouse" : "Edit warehouse"}</DialogTitle>
          <DialogDescription>
            New properties show up as tabs on Inventory once you add them here.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Warehouse 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first in the warehouse tabs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Retired warehouses keep history but drop out of new
                      assignments by default.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                {isNew ? "Add warehouse" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
