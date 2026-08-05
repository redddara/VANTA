"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Pick a member from the list.");

const points = z
  .number({ error: "Enter a points value." })
  .int("Points must be a whole number.")
  .refine((value) => value !== 0, "Points cannot be zero.")
  .refine((value) => Math.abs(value) <= 1000, "Keep points within \u00b11000.");

// A reason is required by a CHECK constraint too; this just fails earlier and
// with a friendlier message than the database would.
const reason = z
  .string()
  .trim()
  .min(3, "Give a reason of at least 3 characters.")
  .max(500, "Keep the reason under 500 characters.");

const GrantSchema = z.object({ memberId: uuid, points, reason });
const EditSchema = z.object({ id: uuid, points, reason });

function revalidateReputation() {
  revalidatePath("/dashboard");
  revalidatePath("/roster");
  revalidatePath("/admin/audit");
}

export async function grantReputation(input: {
  memberId: string;
  points: number;
  reason: string;
}): Promise<ActionResult> {
  const parsed = GrantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("reputation_entries").insert({
    member_id: parsed.data.memberId,
    points: parsed.data.points,
    reason: parsed.data.reason,
    given_by: profile.id,
  });

  if (error) return { ok: false, error: toActionError(error) };

  revalidateReputation();
  return {
    ok: true,
    message:
      parsed.data.points > 0
        ? `Granted +${parsed.data.points} reputation.`
        : `Docked ${Math.abs(parsed.data.points)} reputation.`,
  };
}

export async function editReputation(input: {
  id: string;
  points: number;
  reason: string;
}): Promise<ActionResult> {
  const parsed = EditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("reputation_entries")
    .update(
      { points: parsed.data.points, reason: parsed.data.reason },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can edit reputation entries." };

  revalidateReputation();
  return { ok: true, message: "Reputation entry updated and written to the audit log." };
}

export async function voidReputation(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("reputation_entries")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can void reputation entries." };

  revalidateReputation();
  return { ok: true, message: "Reputation entry voided. A copy is kept in the audit log." };
}
