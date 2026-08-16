"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isStaff } from "@/lib/types/app";

const uuid = z.uuid("Pick a value from the list.");

const amount = z
  .number({ error: "Enter an amount." })
  .positive("Amount must be greater than zero.")
  .max(99_999_999_999, "That amount is too large.");

const purpose = z
  .string()
  .trim()
  .min(1, "Add a purpose / remark.")
  .max(500, "Keep the purpose under 500 characters.");

const entryDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");

const SubmitSchema = z.object({
  entryType: z.enum(["own_expense", "org_withdrawal"]),
  purpose,
  amount,
  entryDate,
  requestReimbursement: z.boolean().optional(),
});

const ReviewSchema = z.object({
  id: uuid,
  status: z.enum(["pending", "reimbursed", "rejected"]),
});

function revalidateReimbursement() {
  revalidatePath("/reimbursement");
  revalidatePath("/admin/reimbursement");
}

export async function submitReimbursement(input: {
  entryType: "own_expense" | "org_withdrawal";
  purpose: string;
  amount: number;
  entryDate: string;
  requestReimbursement?: boolean;
}): Promise<ActionResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  const supabase = await createClient();

  if (parsed.data.entryType === "org_withdrawal") {
    if (!isStaff(profile.crew_rank)) {
      return {
        ok: false,
        error: "Only staff can log org funds withdrawals.",
      };
    }

    const { error } = await supabase.from("reimbursement_logs").insert({
      entry_type: "org_withdrawal",
      purpose: parsed.data.purpose,
      amount: parsed.data.amount,
      entry_date: parsed.data.entryDate,
      logged_by: profile.id,
      status: "recorded",
    });

    if (error) return { ok: false, error: toActionError(error) };

    revalidateReimbursement();
    return { ok: true, message: "Org funds withdrawal logged." };
  }

  const status = parsed.data.requestReimbursement ? "pending" : "none";

  const { error } = await supabase.from("reimbursement_logs").insert({
    entry_type: "own_expense",
    purpose: parsed.data.purpose,
    amount: parsed.data.amount,
    entry_date: parsed.data.entryDate,
    logged_by: profile.id,
    status,
  });

  if (error) return { ok: false, error: toActionError(error) };

  revalidateReimbursement();
  return {
    ok: true,
    message: status === "pending"
      ? "Own expense logged and sent for reimbursement."
      : "Own expense logged (no reimbursement requested).",
  };
}

export async function reviewReimbursement(input: {
  id: string;
  status: "pending" | "reimbursed" | "rejected";
}): Promise<ActionResult> {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  if (!isAdmin(profile.crew_rank)) {
    return { ok: false, error: "Only an admin can update reimbursement status." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("reimbursement_logs")
    .update({ status: parsed.data.status }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("entry_type", "own_expense");

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) {
    return { ok: false, error: "Only pending own-expense requests can be reviewed." };
  }

  revalidateReimbursement();
  return {
    ok: true,
    message:
      parsed.data.status === "reimbursed"
        ? "Marked as reimbursed."
        : parsed.data.status === "rejected"
          ? "Reimbursement rejected."
          : "Moved back to pending.",
  };
}

export async function deleteReimbursement(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("reimbursement_logs")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) {
    return {
      ok: false,
      error: "You can only delete your own open expense logs.",
    };
  }

  revalidateReimbursement();
  return { ok: true, message: "Log deleted." };
}
