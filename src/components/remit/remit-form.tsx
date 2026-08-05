"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { RemitTypeChips } from "@/components/remit/quick-remit-fields";
import {
  MemberCombobox,
  type SelectableMember,
} from "@/components/shared/member-combobox";
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
import { submitRemit } from "@/lib/actions/remit";
import { displayName } from "@/lib/display";
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
  const defaultType =
    types.find((t) => t.is_weekly_quota)?.id ?? types[0]?.id ?? "";

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      memberId: selfId,
      remitTypeId: defaultType,
      quantity: 1,
      amount: null,
      description: "",
    },
  });

  const selectedTypeId = useWatch({ control: form.control, name: "remitTypeId" });
  const memberId = useWatch({ control: form.control, name: "memberId" });
  const selectedType = types.find((t) => t.id === selectedTypeId);
  const credited = members.find((m) => m.id === memberId) ?? self;

  async function onSubmit(values: Values) {
    const result = await submitRemit({
      memberId: values.memberId,
      remitTypeId: values.remitTypeId,
      quantity: values.quantity,
      amount: values.amount,
      description: values.description,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    form.reset({
      memberId: forSomeoneElse ? values.memberId : selfId,
      remitTypeId: values.remitTypeId,
      quantity: 1,
      amount: null,
      description: "",
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
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    autoFocus
                    name={field.name}
                    ref={(el) => {
                      field.ref(el);
                      qtyRef.current = el;
                    }}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === ""
                          ? Number.NaN
                          : event.target.valueAsNumber,
                      )
                    }
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
                      type="number"
                      min={0}
                      step="1"
                      className="pl-7"
                      placeholder="Skip if none"
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
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
