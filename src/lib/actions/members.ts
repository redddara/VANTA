"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireAdmin, requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RANKS } from "@/lib/constants";
import { isKingpin, type Rank } from "@/lib/types/app";

const uuid = z.uuid("Unknown member.");

const IngameNameSchema = z
  .string()
  .trim()
  .min(2, "In-game name needs at least 2 characters.")
  .max(40, "Keep the in-game name under 40 characters.");

const UpdateMemberSchema = z.object({
  id: uuid,
  rank: z.enum(RANKS),
  isActive: z.boolean(),
  ingameName: IngameNameSchema.optional(),
});

const UpdateOwnProfileSchema = z.object({
  ingameName: IngameNameSchema,
});

function revalidateMembers() {
  revalidatePath("/roster");
  revalidatePath("/admin/members");
  revalidatePath("/admin/audit");
  revalidatePath("/dashboard");
  revalidatePath("/reputation/new");
  revalidatePath("/remit/tracker");
}

/**
 * Admin-only. Rank is the whole permission model, so every rule that matters
 * lives in the database: it rejects this for anyone below Underboss, refuses to
 * remove the last active Kingpin, and lets only a Kingpin appoint another. All
 * three hold even if this action is called directly.
 *
 * Renaming another member is Kingpin-only (also enforced in the DB guard).
 */
export async function updateMember(input: {
  id: string;
  rank: Rank;
  isActive: boolean;
  ingameName?: string;
}): Promise<ActionResult> {
  const parsed = UpdateMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireAdmin();

  if (
    parsed.data.ingameName !== undefined &&
    !isKingpin(profile.crew_rank)
  ) {
    return { ok: false, error: "Only a Kingpin can rename another member." };
  }

  const supabase = await createClient();

  const patch: {
    crew_rank: Rank;
    is_active: boolean;
    ingame_name?: string;
  } = {
    crew_rank: parsed.data.rank,
    is_active: parsed.data.isActive,
  };
  if (parsed.data.ingameName !== undefined) {
    patch.ingame_name = parsed.data.ingameName;
  }

  const { error, count } = await supabase
    .from("profiles")
    .update(patch, { count: "exact" })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can manage members." };

  revalidateMembers();
  return { ok: true, message: "Member updated." };
}

/** Any member may set their own in-game name. Everything else is admin-only. */
export async function updateOwnProfile(input: {
  ingameName: string;
}): Promise<ActionResult> {
  const parsed = UpdateOwnProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ ingame_name: parsed.data.ingameName })
    .eq("id", profile.id);

  if (error) return { ok: false, error: toActionError(error) };

  revalidatePath("/settings");
  revalidatePath("/roster");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile updated." };
}
