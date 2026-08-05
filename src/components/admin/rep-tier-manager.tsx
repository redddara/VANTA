"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CraftingUnlockBadges } from "@/components/reputation/crafting-unlocks";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
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
  createRepTier,
  deleteRepTier,
  updateRepTier,
} from "@/lib/actions/reputation";
import {
  CRAFTING_UNLOCK_COLUMNS,
  CRAFTING_UNLOCK_LABELS,
  CRAFTING_UNLOCKS,
  type RepTier,
} from "@/lib/types/app";

const Schema = z.object({
  levelOrder: z
    .number({ error: "Enter a level order." })
    .int("Level order must be a whole number.")
    .min(1, "Level order starts at 1."),
  tierLabel: z.string().trim().min(1, "Give the tier a label.").max(80),
  houseRobPayout: z.string().optional(),
  atmPayout: z.string().optional(),
  launderRate: z.string().optional(),
  storeCapacity: z.string().optional(),
  gpsUnlocked: z.boolean(),
  ropeUnlocked: z.boolean(),
  nosUnlocked: z.boolean(),
  usbUnlocked: z.boolean(),
});

type Values = z.infer<typeof Schema>;

const EMPTY: Values = {
  levelOrder: 1,
  tierLabel: "",
  houseRobPayout: "",
  atmPayout: "",
  launderRate: "",
  storeCapacity: "",
  gpsUnlocked: false,
  ropeUnlocked: false,
  nosUnlocked: false,
  usbUnlocked: false,
};

function fromTier(tier: RepTier): Values {
  return {
    levelOrder: tier.level_order,
    tierLabel: tier.tier_label,
    houseRobPayout: tier.house_rob_payout ?? "",
    atmPayout: tier.atm_payout ?? "",
    launderRate: tier.launder_rate ?? "",
    storeCapacity: tier.store_capacity ?? "",
    gpsUnlocked: tier.gps_unlocked,
    ropeUnlocked: tier.rope_unlocked,
    nosUnlocked: tier.nos_unlocked,
    usbUnlocked: tier.usb_unlocked,
  };
}

export function RepTierManager({ tiers }: { tiers: RepTier[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RepTier | "new" | null>(null);
  const [deleting, setDeleting] = useState<RepTier | null>(null);

  const nextOrder =
    tiers.reduce((max, t) => Math.max(max, t.level_order), 0) + 1;

  async function handleDelete() {
    if (!deleting) return;
    const result = await deleteRepTier(deleting.id);

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
        <Button
          size="sm"
          onClick={() => setEditing("new")}
        >
          <Plus />
          Add tier
        </Button>
      </div>

      <div className="bg-card overflow-x-auto rounded-xl border">
        {tiers.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No tiers yet"
            description="Add the first level of the ladder. Members stay unassigned until staff places them."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="hidden md:table-cell">Payouts</TableHead>
                <TableHead>Crafting</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="tabular text-muted-foreground">
                    {tier.level_order}
                  </TableCell>
                  <TableCell className="font-medium">{tier.tier_label}</TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                    {[
                      tier.house_rob_payout,
                      tier.atm_payout,
                      tier.launder_rate,
                      tier.store_capacity,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <CraftingUnlockBadges tier={tier} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(tier)}
                        aria-label={`Edit ${tier.tier_label}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(tier)}
                        aria-label={`Delete ${tier.tier_label}`}
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

      <TierEditorDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        tier={editing === "new" || editing === null ? null : editing}
        defaultOrder={nextOrder}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this tier?"
        description={
          deleting
            ? `Remove “${deleting.tier_label}” from the ladder. Members still on it must be moved first.`
            : ""
        }
        confirmLabel="Delete tier"
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}

function TierEditorDialog({
  open,
  onOpenChange,
  tier,
  defaultOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: RepTier | null;
  defaultOrder: number;
  onSaved: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    values: tier ? fromTier(tier) : { ...EMPTY, levelOrder: defaultOrder },
  });

  async function onSubmit(values: Values) {
    const result = tier
      ? await updateRepTier({ id: tier.id, ...values })
      : await createRepTier(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tier ? "Edit tier" : "Add tier"}</DialogTitle>
          <DialogDescription>
            Level order is the ladder position (1 = lowest). Payout fields are
            free text so you can enter values like $10,500 or $90/MB as-is.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
              <FormField
                control={form.control}
                name="levelOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? Number.NaN
                              : event.target.valueAsNumber,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tierLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Consistent Mansion" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["houseRobPayout", "House Rob"],
                  ["atmPayout", "ATM"],
                  ["launderRate", "Launder"],
                  ["storeCapacity", "Store"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input placeholder="—" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Crafting unlocks</p>
              {CRAFTING_UNLOCKS.map((key) => {
                const fieldName = {
                  gps: "gpsUnlocked",
                  rope: "ropeUnlocked",
                  nos: "nosUnlocked",
                  usb: "usbUnlocked",
                }[key] as
                  | "gpsUnlocked"
                  | "ropeUnlocked"
                  | "nosUnlocked"
                  | "usbUnlocked";

                return (
                  <FormField
                    key={key}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                        <FormLabel className="m-0">
                          {CRAFTING_UNLOCK_LABELS[key]}
                          <span className="sr-only">
                            ({CRAFTING_UNLOCK_COLUMNS[key]})
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="animate-spin" />
                )}
                {tier ? "Save changes" : "Add tier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
