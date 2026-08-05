"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Minus, Plus } from "lucide-react";
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
import { grantReputation } from "@/lib/actions/reputation";
import { cn } from "@/lib/utils";

const Schema = z.object({
  memberId: z.uuid("Pick the member this applies to."),
  points: z
    .number({ error: "Enter a points value." })
    .int("Points must be a whole number.")
    .refine((value) => value !== 0, "Points cannot be zero."),
  reason: z
    .string()
    .trim()
    .min(3, "A reason is required \u2014 at least 3 characters.")
    .max(500, "Keep the reason under 500 characters."),
});

type Values = z.infer<typeof Schema>;

const QUICK_VALUES = [-10, -5, -1, 1, 5, 10];

export function ReputationForm({ members }: { members: SelectableMember[] }) {
  const router = useRouter();

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { memberId: "", points: 0, reason: "" },
  });

  const points = useWatch({ control: form.control, name: "points" });

  async function onSubmit(values: Values) {
    const result = await grantReputation(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    form.reset({ memberId: values.memberId, points: 0, reason: "" });
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="points"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Points</FormLabel>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_VALUES.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={field.value === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => field.onChange(value)}
                    className={cn(
                      "tabular w-14",
                      field.value !== value &&
                        (value > 0
                          ? "text-[var(--success)]"
                          : "text-destructive"),
                    )}
                  >
                    {value > 0 ? `+${value}` : value}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => field.onChange((field.value || 0) - 1)}
                  aria-label="Decrease points"
                >
                  <Minus />
                </Button>

                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    placeholder="0"
                    className={cn(
                      "tabular h-11 text-center text-lg font-semibold",
                      points > 0 && "text-[var(--success)]",
                      points < 0 && "text-destructive",
                    )}
                    value={field.value === 0 ? "" : field.value}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value === "" ? 0 : event.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  onClick={() => field.onChange((field.value || 0) + 1)}
                  aria-label="Increase points"
                >
                  <Plus />
                </Button>
              </div>

              <FormDescription>
                Positive grants reputation, negative docks it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What earned or cost this reputation? The member will see this."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Required. The member sees the reason on their dashboard.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {points < 0 ? "Dock reputation" : "Grant reputation"}
          </Button>
          <p className="text-muted-foreground text-xs">
            Reputation entries are permanent unless an admin voids them.
          </p>
        </div>
      </form>
    </Form>
  );
}
