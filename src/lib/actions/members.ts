"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CREW_RANKS } from "@/lib/constants";

const uuid = z.uuid("Unknown member.");

const UpdateMemberSchema = z.object({
  id: uuid,
  role: z.enum(["member", "officer", "admin"]),
  crewRank: z.enum(CREW_RANKS),
  isActive: z.boolean(),
});

const UpdateOwnProfileSchema = z.object({
  ingameName: z
    .string()
    .trim()
    .min(2, "Your in-game name needs at least 2 characters.")
    .max(40, "Keep your in-game name under 40 characters."),
});

function revalidateMembers() {
  revalidatePath("/roster");
  revalidatePath("/admin/members");
  revalidatePath("/admin/audit");
  revalidatePath("/dashboard");
}

/**
 * Admin-only. The database rejects this for anyone else and refuses to remove
 * the last active admin, so both rules hold even if this action is called
 * directly.
 */
export async function updateMember(input: {
  id: string;
  role: "member" | "officer" | "admin";
  crewRank: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const parsed = UpdateMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("profiles")
    .update(
      {
        role: parsed.data.role,
        crew_rank: parsed.data.crewRank,
        is_active: parsed.data.isActive,
      },
      { count: "exact" },
    )
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
