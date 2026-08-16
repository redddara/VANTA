"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { submitReimbursement } from "@/lib/actions/reimbursement";
import { REIMBURSEMENT_ENTRY_TYPE_LABELS } from "@/lib/constants";

function manilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const Schema = z.object({
  entryType: z.enum(["own_expense", "org_withdrawal"]),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
  amount: z
    .number({ error: "Enter an amount." })
    .positive("Amount must be greater than zero."),
  purpose: z
    .string()
    .trim()
    .min(1, "Add a purpose / remark.")
    .max(500),
  requestReimbursement: z.boolean(),
});

type Values = z.infer<typeof Schema>;

export function ReimbursementForm({
  canLogOrgWithdrawal,
}: {
  canLogOrgWithdrawal: boolean;
}) {
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      entryType: "own_expense",
      entryDate: manilaToday(),
      amount: undefined,
      purpose: "",
      requestReimbursement: true,
    },
  });

  const entryType = useWatch({ control: form.control, name: "entryType" });
  const pending = form.formState.isSubmitting;

  async function onSubmit(values: Values) {
    const result = await submitReimbursement({
      entryType: values.entryType,
      entryDate: values.entryDate,
      amount: values.amount,
      purpose: values.purpose,
      requestReimbursement:
        values.entryType === "own_expense"
          ? values.requestReimbursement
          : undefined,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    form.reset({
      entryType: values.entryType,
      entryDate: manilaToday(),
      amount: undefined,
      purpose: "",
      requestReimbursement: true,
    });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="entryType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={pending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="own_expense">
                    {REIMBURSEMENT_ENTRY_TYPE_LABELS.own_expense}
                  </SelectItem>
                  {canLogOrgWithdrawal ? (
                    <SelectItem value="org_withdrawal">
                      {REIMBURSEMENT_ENTRY_TYPE_LABELS.org_withdrawal}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              <FormDescription>
                {entryType === "org_withdrawal"
                  ? "Required whenever org cash is withdrawn."
                  : "Money spent from your own pocket."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="entryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={pending} />
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
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="0"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      field.onChange(raw === "" ? undefined : Number(raw));
                    }}
                    disabled={pending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Where the money went / what it was for"
                  rows={3}
                  {...field}
                  disabled={pending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {entryType === "own_expense" ? (
          <FormField
            control={form.control}
            name="requestReimbursement"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm">Request reimbursement</FormLabel>
                  <FormDescription>
                    Turn on if fund holders should pay this back.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={pending}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        ) : null}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="animate-spin" /> : null}
          Log entry
        </Button>
      </form>
    </Form>
  );
}
