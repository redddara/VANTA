"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createRemitType,
  deleteRemitType,
  updateRemitType,
} from "@/lib/actions/remit";
import type { InventoryItem, RemitType } from "@/lib/types/app";

const NONE = "__none__";

const Schema = z.object({
  name: z.string().trim().min(1).max(80),
  isWeeklyQuota: z.boolean(),
  quotaAmount: z
    .number({ error: "Enter a quota." })
    .int()
    .positive()
    .optional()
    .nullable(),
  inventoryItemId: z.uuid().optional().nullable(),
});

type Values = z.infer<typeof Schema>;

export function RemitTypesManager({
  types,
  inventoryItems,
}: {
  types: RemitType[];
  inventoryItems: InventoryItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RemitType | "new" | null>(null);
  const [deleting, setDeleting] = useState<RemitType | null>(null);

  const itemName = (id: string | null) =>
    id ? (inventoryItems.find((i) => i.id === id)?.name ?? "Unknown item") : null;

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteRemitType(deleting.id);
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
          Add type
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {types.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No remit types"
            description="Add the catalog of items members can remit."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Weekly quota</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => {
                const linked = itemName(type.inventory_item_id);
                return (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      {type.is_weekly_quota ? (
                        <Badge variant="outline">{type.quota_amount} / week</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {linked ? (
                        <span className="text-sm">{linked}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Not linked
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(type)}
                          aria-label={`Edit ${type.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(type)}
                          aria-label={`Delete ${type.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <TypeEditorDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        type={editing === "new" || editing === null ? null : editing}
        inventoryItems={inventoryItems}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this remit type?"
        description={
          deleting
            ? `Remove “${deleting.name}”. Entries that still use it must be changed first.`
            : ""
        }
        confirmLabel="Delete type"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}

function TypeEditorDialog({
  open,
  onOpenChange,
  type,
  inventoryItems,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: RemitType | null;
  inventoryItems: InventoryItem[];
  onSaved: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    values: type
      ? {
          name: type.name,
          isWeeklyQuota: type.is_weekly_quota,
          quotaAmount: type.quota_amount,
          inventoryItemId: type.inventory_item_id,
        }
      : {
          name: "",
          isWeeklyQuota: false,
          quotaAmount: 2,
          inventoryItemId: null,
        },
  });

  const isWeekly = useWatch({ control: form.control, name: "isWeeklyQuota" });

  async function onSubmit(values: Values) {
    const payload = {
      name: values.name,
      isWeeklyQuota: values.isWeeklyQuota,
      quotaAmount: values.isWeeklyQuota ? values.quotaAmount : null,
      inventoryItemId: values.inventoryItemId || null,
    };

    const result = type
      ? await updateRemitType({ id: type.id, ...payload })
      : await createRemitType(payload);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type ? "Edit remit type" : "Add remit type"}</DialogTitle>
          <DialogDescription>
            Link an inventory item so approved remits of this type add inbound
            stock automatically.
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
                    <Input placeholder="Chopmats — Aluminum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inventoryItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory item</FormLabel>
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(value) =>
                      field.onChange(value === NONE ? null : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Not linked" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Not linked</SelectItem>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                          {!item.is_active ? " (retired)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    When linked, approving this remit adds the quantity to that
                    stash item.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isWeeklyQuota"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                  <div>
                    <FormLabel className="m-0">Weekly quota</FormLabel>
                    <FormDescription>
                      Required every week for every active member.
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

            {isWeekly ? (
              <FormField
                control={form.control}
                name="quotaAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quota amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={
                          field.value == null || Number.isNaN(field.value)
                            ? ""
                            : field.value
                        }
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? null
                              : event.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                {type ? "Save changes" : "Add type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
