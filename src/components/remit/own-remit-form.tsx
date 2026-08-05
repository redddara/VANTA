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
import { Textarea } from "@/components/ui/textarea";
import { submitOwnRemit } from "@/lib/actions/remit";
import type { RemitType } from "@/lib/types/app";

const Schema = z.object({
  remitTypeId: z.uuid("Pick what you are remitting."),
  quantity: z
    .number({ error: "Enter a quantity." })
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
  amount: z
    .number()
    .positive("Amount must be greater than zero.")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters."),
});

type Values = z.infer<typeof Schema>;

export function OwnRemitForm({ types }: { types: RemitType[] }) {
  const router = useRouter();
  const defaultType =
    types.find((t) => t.is_weekly_quota)?.id ?? types[0]?.id ?? "";

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: {
      remitTypeId: defaultType,
      quantity: 1,
      amount: null,
      description: "",
    },
  });

  const selectedTypeId = useWatch({ control: form.control, name: "remitTypeId" });
  const selectedType = types.find((t) => t.id === selectedTypeId);

  async function onSubmit(values: Values) {
    const result = await submitOwnRemit({
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
      remitTypeId: values.remitTypeId,
      quantity: 1,
      amount: null,
      description: "",
    });
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="remitTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a remit type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                      {type.is_weekly_quota ? " (weekly quota)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType?.is_weekly_quota ? (
                <FormDescription>
                  Weekly quota: {selectedType.quota_amount} required every week
                  (Sunday reset).
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cash amount (optional)</FormLabel>
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
                    placeholder="Leave blank for item remits"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ""}
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
              <FormDescription>
                Only fill this in when the remit also includes cash.
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
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional context for the reviewer"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting || types.length === 0}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Log remit
        </Button>
      </form>
    </Form>
  );
}
