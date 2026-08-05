"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Pick a value from the list.");

const tierFields = {
  levelOrder: z
    .number({ error: "Enter a level order." })
    .int("Level order must be a whole number.")
    .min(1, "Level order starts at 1."),
  tierLabel: z
    .string()
    .trim()
    .min(1, "Give the tier a label.")
    .max(80, "Keep the label under 80 characters."),
  houseRobPayout: z.string().trim().max(80).optional().nullable(),
  atmPayout: z.string().trim().max(80).optional().nullable(),
  launderRate: z.string().trim().max(80).optional().nullable(),
  storeCapacity: z.string().trim().max(80).optional().nullable(),
  gpsUnlocked: z.boolean(),
  ropeUnlocked: z.boolean(),
  nosUnlocked: z.boolean(),
  usbUnlocked: z.boolean(),
};

const SetMemberTierSchema = z.object({
  memberId: uuid,
  tierId: uuid,
});

const CreateTierSchema = z.object(tierFields);
const UpdateTierSchema = z.object({ id: uuid, ...tierFields });

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function revalidateRep() {
  revalidatePath("/dashboard");
  revalidatePath("/roster");
  revalidatePath("/rep-tiers");
  revalidatePath("/reputation/new");
  revalidatePath("/admin/rep-tiers");
  revalidatePath("/admin/members");
  revalidatePath("/admin/audit");
}

function tierRow(data: z.infer<typeof CreateTierSchema>) {
  return {
    level_order: data.levelOrder,
    tier_label: data.tierLabel,
    house_rob_payout: emptyToNull(data.houseRobPayout),
    atm_payout: emptyToNull(data.atmPayout),
    launder_rate: emptyToNull(data.launderRate),
    store_capacity: emptyToNull(data.storeCapacity),
    gps_unlocked: data.gpsUnlocked,
    rope_unlocked: data.ropeUnlocked,
    nos_unlocked: data.nosUnlocked,
    usb_unlocked: data.usbUnlocked,
  };
}

/** Place or move a member on the reputation ladder. */
export async function setMemberTier(input: {
  memberId: string;
  tierId: string;
}): Promise<ActionResult> {
  const parsed = SetMemberTierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  const supabase = await createClient();

  const { data: tier } = await supabase
    .from("rep_tiers")
    .select("tier_label")
    .eq("id", parsed.data.tierId)
    .maybeSingle();

  if (!tier) return { ok: false, error: "That tier no longer exists." };

  const { error } = await supabase.from("member_rep").upsert(
    {
      member_id: parsed.data.memberId,
      current_tier_id: parsed.data.tierId,
      updated_by: profile.id,
    },
    { onConflict: "member_id" },
  );

  if (error) return { ok: false, error: toActionError(error) };

  revalidateRep();
  return { ok: true, message: `Moved to ${tier.tier_label}.` };
}

export async function createRepTier(
  input: z.infer<typeof CreateTierSchema>,
): Promise<ActionResult> {
  const parsed = CreateTierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("rep_tiers").insert(tierRow(parsed.data));

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That level order is already taken." };
    }
    return { ok: false, error: toActionError(error) };
  }

  revalidateRep();
  return { ok: true, message: `Added ${parsed.data.tierLabel}.` };
}

export async function updateRepTier(
  input: z.infer<typeof UpdateTierSchema>,
): Promise<ActionResult> {
  const parsed = UpdateTierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("rep_tiers")
    .update(tierRow(parsed.data), { count: "exact" })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That level order is already taken." };
    }
    return { ok: false, error: toActionError(error) };
  }
  if (!count) return { ok: false, error: "Only an admin can edit the ladder." };

  revalidateRep();
  return { ok: true, message: `Updated ${parsed.data.tierLabel}.` };
}

export async function deleteRepTier(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid tier." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("rep_tiers")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "That tier is still assigned to someone. Move them first.",
      };
    }
    return { ok: false, error: toActionError(error) };
  }
  if (!count) return { ok: false, error: "Only an admin can delete tiers." };

  revalidateRep();
  return { ok: true, message: "Tier removed." };
}
