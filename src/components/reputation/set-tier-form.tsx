"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setMemberTier } from "@/lib/actions/reputation";
import type { RepTier } from "@/lib/types/app";

const Schema = z.object({
  memberId: z.uuid("Pick the member this applies to."),
  tierId: z.uuid("Pick a tier."),
});

type Values = z.infer<typeof Schema>;

export function SetTierForm({
  members,
  tiers,
  currentByMember,
}: {
  members: SelectableMember[];
  tiers: RepTier[];
  /** member_id → current_tier_id for preselecting when a member is chosen. */
  currentByMember: Record<string, string | null>;
}) {
  const router = useRouter();

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { memberId: "", tierId: "" },
  });

  async function onSubmit(values: Values) {
    const result = await setMemberTier(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
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
                  onChange={(id) => {
                    field.onChange(id ?? "");
                    if (id) {
                      const current = currentByMember[id];
                      if (current) form.setValue("tierId", current);
                    }
                  }}
                  invalid={!!fieldState.error}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tier</FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={tiers.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        tiers.length === 0
                          ? "No tiers configured yet"
                          : "Select a tier"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.level_order}. {tier.tier_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Ordered lowest to highest. This becomes the member&apos;s only
                current tier.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting || tiers.length === 0}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Set tier
        </Button>
      </form>
    </Form>
  );
}
