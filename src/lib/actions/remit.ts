"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Pick a member from the list.");

const amount = z
  .number({ error: "Enter an amount." })
  .positive("Amount must be greater than zero.")
  .max(99_999_999_999, "That amount is too large.");

const description = z
  .string()
  .trim()
  .max(500, "Keep the description under 500 characters.")
  .optional();

const SubmitRemitSchema = z.object({ memberId: uuid, amount, description });
const EditRemitSchema = z.object({ id: uuid, amount, description });
const ReviewRemitSchema = z.object({
  id: uuid,
  status: z.enum(["pending", "approved", "rejected"]),
});

/** Refresh every surface that shows remit totals or queues. */
function revalidateRemit() {
  revalidatePath("/dashboard");
  revalidatePath("/roster");
  revalidatePath("/admin/remit");
  revalidatePath("/admin/audit");
}

export async function submitRemit(input: {
  memberId: string;
  amount: number;
  description?: string;
}): Promise<ActionResult> {
  const parsed = SubmitRemitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  const supabase = await createClient();

  // submitted_by must equal auth.uid() or the insert policy rejects the row,
  // so a contribution can never be logged under someone else's name.
  const { error } = await supabase.from("remit_logs").insert({
    member_id: parsed.data.memberId,
    amount: parsed.data.amount,
    description: parsed.data.description || null,
    submitted_by: profile.id,
  });

  if (error) return { ok: false, error: toActionError(error) };

  revalidateRemit();
  return { ok: true, message: "Remit submitted for approval." };
}

export async function reviewRemit(input: {
  id: string;
  status: "pending" | "approved" | "rejected";
}): Promise<ActionResult> {
  const parsed = ReviewRemitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

  // reviewed_by is stamped by a database trigger from the JWT, and the change
  // is written to audit_log by another. Nothing to set here but the status.
  const { error, count } = await supabase
    .from("remit_logs")
    .update({ status: parsed.data.status }, { count: "exact" })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can review remit entries." };

  revalidateRemit();
  return {
    ok: true,
    message:
      parsed.data.status === "approved"
        ? "Remit approved."
        : parsed.data.status === "rejected"
          ? "Remit rejected."
          : "Remit moved back to pending.",
  };
}

export async function editRemit(input: {
  id: string;
  amount: number;
  description?: string;
}): Promise<ActionResult> {
  const parsed = EditRemitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("remit_logs")
    .update(
      { amount: parsed.data.amount, description: parsed.data.description || null },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can edit remit entries." };

  revalidateRemit();
  return { ok: true, message: "Remit entry updated and written to the audit log." };
}

export async function voidRemit(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("remit_logs")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can void remit entries." };

  revalidateRemit();
  return { ok: true, message: "Remit entry voided. A copy is kept in the audit log." };
}
