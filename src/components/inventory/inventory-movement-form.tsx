"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  MemberCombobox,
  type SelectableMember,
} from "@/components/shared/member-combobox";
import { QuantityInput } from "@/components/shared/quantity-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logInventoryMovement } from "@/lib/actions/inventory";
import { INVENTORY_DIRECTION_LABELS } from "@/lib/constants";
import type { InventoryItem, InventoryStock } from "@/lib/types/app";
import { cn } from "@/lib/utils";

const Schema = z.object({
  itemId: z.uuid("Pick an item."),
  direction: z.enum(["inbound", "outbound"]),
  quantity: z
    .number({ error: "Enter a quantity." })
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  note: z.string().trim().max(500),
  memberId: z.uuid().optional().nullable(),
});

type Values = z.infer<typeof Schema>;

export function InventoryMovementForm({
  items,
  stock,
  members,
}: {
  items: InventoryItem[];
  stock: InventoryStock[];
  members: SelectableMember[];
}) {
  const router = useRouter();
  const qtyRef = useRef<HTMLInputElement | null>(null);
  const activeItems = items.filter((i) => i.is_active);
  const defaultItem = activeItems[0]?.id ?? "";

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      itemId: defaultItem,
      direction: "inbound",
      quantity: undefined,
      note: "",
      memberId: null,
    },
  });

  const direction = useWatch({ control: form.control, name: "direction" });
  const itemId = useWatch({ control: form.control, name: "itemId" });
  const onHand =
    stock.find((s) => s.item_id === itemId)?.on_hand ??
    (items.some((i) => i.id === itemId) ? 0 : null);

  async function onSubmit(values: Values) {
    const result = await logInventoryMovement({
      itemId: values.itemId,
      direction: values.direction,
      quantity: values.quantity,
      note: values.note,
      memberId: values.memberId,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    form.reset({
      itemId: values.itemId,
      direction: values.direction,
      quantity: undefined,
      note: "",
      memberId: null,
    });
    router.refresh();
    requestAnimationFrame(() => qtyRef.current?.focus());
  }

  if (activeItems.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No active items yet. An admin needs to add inventory items first.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direction</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {(["inbound", "outbound"] as const).map((value) => {
                  const selected = field.value === value;
                  const Icon =
                    value === "inbound" ? ArrowDownToLine : ArrowUpFromLine;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                        selected
                          ? value === "inbound"
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-warning/40 bg-warning/10 text-warning"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {INVENTORY_DIRECTION_LABELS[value]}
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="itemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick an item" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {onHand != null ? (
                <FormDescription className="tabular">
                  On hand: {onHand}
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <QuantityInput
                  ref={(node) => {
                    field.ref(node);
                    qtyRef.current = node;
                  }}
                  name={field.name}
                  placeholder="e.g. 4"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {direction === "outbound" ? (
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issued to (optional)</FormLabel>
                <FormControl>
                  <MemberCombobox
                    members={members}
                    value={field.value ?? null}
                    onChange={(id) => field.onChange(id)}
                    placeholder="Nobody specific"
                  />
                </FormControl>
                <FormDescription>
                  Who received or used this stock, if anyone.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Source, reason, destination…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
          Log {INVENTORY_DIRECTION_LABELS[direction].toLowerCase()}
        </Button>
      </form>
    </Form>
  );
}
