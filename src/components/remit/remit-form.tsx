"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { submitRemit } from "@/lib/actions/remit";
import { formatMoney } from "@/lib/format";

const Schema = z.object({
  memberId: z.uuid("Pick the member this remit belongs to."),
  amount: z
    .number({ error: "Enter an amount." })
    .positive("Amount must be greater than zero."),
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters."),
});

type Values = z.infer<typeof Schema>;

export function RemitForm({ members }: { members: SelectableMember[] }) {
  const router = useRouter();

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { memberId: "", amount: 0, description: "" },
  });

  const amount = useWatch({ control: form.control, name: "amount" });

  async function onSubmit(values: Values) {
    const result = await submitRemit({
      memberId: values.memberId,
      amount: values.amount,
      description: values.description,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    form.reset({ memberId: values.memberId, amount: 0, description: "" });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormDescription>
                Who this contribution is credited to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="tabular h-11 pl-7"
                    value={Number.isFinite(field.value) && field.value !== 0 ? field.value : ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === "" ? 0 : event.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </div>
              </FormControl>
              <FormDescription>
                {amount > 0 ? formatMoney(amount) : "In-game cash contributed to the org."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description
                <span className="text-muted-foreground font-normal">optional</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Where the money came from, e.g. warehouse run split"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="sm:w-auto"
          >
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Submit remit
          </Button>
          <p className="text-muted-foreground text-xs">
            Submitted entries stay pending until an admin approves them.
          </p>
        </div>
      </form>
    </Form>
  );
}
