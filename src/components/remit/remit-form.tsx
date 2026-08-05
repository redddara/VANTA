"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProofAttach } from "@/components/remit/proof-attach";
import { RemitTypeChips } from "@/components/remit/quick-remit-fields";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { submitRemit } from "@/lib/actions/remit";
import { displayName } from "@/lib/display";
import { formatDate } from "@/lib/format";
import { manilaWeekStart, upcomingManilaWeeks } from "@/lib/manila-week";
import {
  REMIT_PROOF_BUCKET,
  remitProofExtension,
  validateRemitProofFile,
  type RemitProofMime,
} from "@/lib/remit-proof";
import { createClient } from "@/lib/supabase/client";
import type { RemitType } from "@/lib/types/app";

const Schema = z.object({
  memberId: z.uuid("Pick the member this remit belongs to."),
  remitTypeId: z.uuid("Pick what is being remitted."),
  quantity: z
    .number({ error: "Enter a quantity." })
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  amount: z
    .number()
    .positive("Amount must be greater than zero.")
    .optional()
    .nullable(),
  description: z.string().trim().max(500),
  isAdvance: z.boolean(),
  targetWeekStart: z.string().optional().nullable(),
});

type Values = z.infer<typeof Schema>;

export function RemitForm({
  members,
  types,
  selfId,
  canCreditOthers = false,
}: {
  members: SelectableMember[];
  types: RemitType[];
  /** Signed-in member — form defaults to them, no picker required. */
  selfId: string;
  /** Enforcer+: show the optional “credit someone else” control. */
  canCreditOthers?: boolean;
}) {
  const router = useRouter();
  const qtyRef = useRef<HTMLInputElement | null>(null);
  const self = members.find((m) => m.id === selfId) ?? null;
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const defaultType =
    types.find((t) => t.is_weekly_quota)?.id ?? types[0]?.id ?? "";
  const thisWeek = manilaWeekStart();
  const advanceWeeks = upcomingManilaWeeks(8).filter((w) => w !== thisWeek);

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      memberId: selfId,
      remitTypeId: defaultType,
      quantity: 1,
      amount: null,
      description: "",
      isAdvance: false,
      targetWeekStart: advanceWeeks[0] ?? thisWeek,
    },
  });

  const selectedTypeId = useWatch({ control: form.control, name: "remitTypeId" });
  const memberId = useWatch({ control: form.control, name: "memberId" });
  const isAdvance = useWatch({ control: form.control, name: "isAdvance" });
  const selectedType = types.find((t) => t.id === selectedTypeId);
  const credited = members.find((m) => m.id === memberId) ?? self;

  async function onSubmit(values: Values) {
    let proofPath: string | null = null;
    const supabase = createClient();

    if (proofFile) {
      const issue = validateRemitProofFile(proofFile);
      if (issue) {
        toast.error(issue);
        return;
      }
      const ext = remitProofExtension(proofFile.type as RemitProofMime);
      proofPath = `${selfId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(REMIT_PROOF_BUCKET)
        .upload(proofPath, proofFile, {
          cacheControl: "3600",
          contentType: proofFile.type,
          upsert: false,
        });
      if (uploadError) {
        toast.error(uploadError.message || "Could not upload the proof image.");
        return;
      }
    }

    const result = await submitRemit({
      memberId: values.memberId,
      remitTypeId: values.remitTypeId,
      quantity: values.quantity,
      amount: values.amount,
      description: values.description,
      proofPath,
      targetWeekStart:
        canCreditOthers && values.isAdvance ? values.targetWeekStart : null,
    });

    if (!result.ok) {
      if (proofPath) {
        await supabase.storage.from(REMIT_PROOF_BUCKET).remove([proofPath]);
      }
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setProofFile(null);
    form.reset({
      memberId: forSomeoneElse ? values.memberId : selfId,
      remitTypeId: values.remitTypeId,
      quantity: 1,
      amount: null,
      description: "",
      isAdvance: false,
      targetWeekStart: advanceWeeks[0] ?? thisWeek,
    });
    router.refresh();
    requestAnimationFrame(() => qtyRef.current?.focus());
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {canCreditOthers ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                Crediting{" "}
                <span className="font-medium">
                  {credited ? displayName(credited) : "you"}
                </span>
              </p>
              <Button
                type="button"
                variant={forSomeoneElse ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  const next = !forSomeoneElse;
                  setForSomeoneElse(next);
                  if (!next) form.setValue("memberId", selfId);
                }}
              >
                {forSomeoneElse ? "Use myself instead" : "Credit someone else"}
              </Button>
            </div>

            {forSomeoneElse ? (
              <FormField
                control={form.control}
                name="memberId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Member</FormLabel>
                    <FormControl>
                      <MemberCombobox
                        members={members}
                        value={field.value || null}
                        onChange={(id) => field.onChange(id ?? "")}
                        invalid={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="memberId"
                render={() => <FormMessage />}
              />
            )}
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="remitTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <FormControl>
                <RemitTypeChips
                  types={types}
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    requestAnimationFrame(() => qtyRef.current?.focus());
                  }}
                  disabled={types.length === 0}
                />
              </FormControl>
              {selectedType?.is_weekly_quota ? (
                <FormDescription>
                  Counts toward weekly quota of {selectedType.quota_amount}.
                </FormDescription>
              ) : null}
              {selectedType?.inventory_item_id ? (
                <FormDescription>
                  Approved quantity is added to inventory inbound.
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qty</FormLabel>
                <FormControl>
                  <QuantityInput
                    autoFocus
                    name={field.name}
                    ref={(el) => {
                      field.ref(el);
                      qtyRef.current = el;
                    }}
                    onBlur={field.onBlur}
                    value={field.value}
                    onChange={field.onChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void form.handleSubmit(onSubmit)();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cash (optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="tabular pl-7"
                      placeholder="Skip if none"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={
                        field.value == null || Number.isNaN(field.value)
                          ? ""
                          : String(field.value)
                      }
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/[^\d.]/g, "");
                        if (raw === "" || raw === ".") {
                          field.onChange(null);
                          return;
                        }
                        const next = Number(raw);
                        field.onChange(Number.isNaN(next) ? null : next);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {canCreditOthers && advanceWeeks.length > 0 ? (
          <div className="space-y-3 rounded-lg border px-3 py-3">
            <FormField
              control={form.control}
              name="isAdvance"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div>
                    <FormLabel className="m-0">Advance remit</FormLabel>
                    <FormDescription>
                      Credit a future week instead of this week.
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
            {isAdvance ? (
              <FormField
                control={form.control}
                name="targetWeekStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit week</FormLabel>
                    <Select
                      value={field.value ?? advanceWeeks[0]}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {advanceWeeks.map((week) => (
                          <SelectItem key={week} value={week}>
                            Week of {formatDate(week)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>
        ) : null}

        <ProofAttach
          file={proofFile}
          onChange={setProofFile}
          disabled={form.formState.isSubmitting}
        />

        <Button type="submit" disabled={form.formState.isSubmitting || types.length === 0}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Log remit
          <span className="text-muted-foreground ml-1 hidden text-xs font-normal sm:inline">
            Enter
          </span>
        </Button>
      </form>
    </Form>
  );
}
