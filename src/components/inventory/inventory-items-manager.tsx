"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from "@/lib/actions/inventory";
import type { InventoryItem } from "@/lib/types/app";

const Schema = z.object({
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean(),
});

type Values = z.infer<typeof Schema>;

export function InventoryItemsManager({ items }: { items: InventoryItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteInventoryItem(deleting.id);
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
          Add item
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {items.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No inventory items"
            description="Add the catalog of items the crew tracks in the stash."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {item.is_active ? (
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
                        onClick={() => setEditing(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(item)}
                        aria-label={`Delete ${item.name}`}
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

      <ItemDialog
        item={editing}
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
        title="Delete this item?"
        description={
          deleting
            ? `Remove “${deleting.name}” from the catalog. Items with movements cannot be deleted — retire them instead.`
            : ""
        }
        confirmLabel="Delete item"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

function ItemDialog({
  item,
  onClose,
  onSaved,
}: {
  item: InventoryItem | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = item != null;
  const isNew = item === "new";

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    values:
      item && item !== "new"
        ? { name: item.name, isActive: item.is_active }
        : { name: "", isActive: true },
  });

  async function onSubmit(values: Values) {
    if (isNew) {
      const result = await createInventoryItem(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      onSaved();
      return;
    }

    if (!item) {
      toast.error("Nothing to save.");
      return;
    }

    const result = await updateInventoryItem({
      id: item.id,
      name: values.name,
      isActive: values.isActive,
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
          <DialogTitle>{isNew ? "Add inventory item" : "Edit item"}</DialogTitle>
          <DialogDescription>
            Items appear in the inbound/outbound form when they are active.
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
                    <Input placeholder="e.g. Chopmats — Aluminum" {...field} />
                  </FormControl>
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
                      Retired items stay in stock history but cannot be logged.
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
                {isNew ? "Add item" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
