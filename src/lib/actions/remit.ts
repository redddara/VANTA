"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Pick a value from the list.");

const quantity = z
  .number({ error: "Enter a quantity." })
  .int("Quantity must be a whole number.")
  .positive("Quantity must be greater than zero.")
  .max(100_000, "That quantity is too large.");

const amount = z
  .number()
  .positive("Amount must be greater than zero.")
  .max(99_999_999_999, "That amount is too large.")
  .optional()
  .nullable();

const description = z
  .string()
  .trim()
  .max(500, "Keep the description under 500 characters.")
  .optional();

const SubmitRemitSchema = z.object({
  memberId: uuid,
  remitTypeId: uuid,
  quantity,
  amount,
  description,
  proofPath: z
    .string()
    .trim()
    .min(1)
    .max(500, "Proof path is too long.")
    .optional()
    .nullable(),
  targetWeekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid week.")
    .optional()
    .nullable(),
});

const EditRemitSchema = z.object({
  id: uuid,
  remitTypeId: uuid,
  quantity,
  amount,
  description,
});

const ReviewRemitSchema = z.object({
  id: uuid,
  status: z.enum(["pending", "approved", "rejected"]),
});

const RemitTypeSchema = z.object({
  name: z.string().trim().min(1, "Give the type a name.").max(80),
  isWeeklyQuota: z.boolean(),
  quotaAmount: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  inventoryItemId: uuid.optional().nullable(),
});

function revalidateRemit() {
  revalidatePath("/dashboard");
  revalidatePath("/roster");
  revalidatePath("/remit/mine");
  revalidatePath("/remit/new");
  revalidatePath("/remit/compliance");
  revalidatePath("/remit/tracker");
  revalidatePath("/inventory");
  revalidatePath("/admin/remit");
  revalidatePath("/admin/remit-types");
  revalidatePath("/admin/audit");
}

function optionalAmount(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

export async function submitRemit(input: {
  memberId: string;
  remitTypeId: string;
  quantity: number;
  amount?: number | null;
  description?: string;
  proofPath?: string | null;
  targetWeekStart?: string | null;
}): Promise<ActionResult> {
  const parsed = SubmitRemitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  const supabase = await createClient();

  const proofPath = parsed.data.proofPath?.trim() || null;
  if (proofPath && !proofPath.startsWith(`${profile.id}/`)) {
    return { ok: false, error: "Proof upload looks invalid. Attach the image again." };
  }

  const { error } = await supabase.from("remit_logs").insert({
    member_id: parsed.data.memberId,
    remit_type_id: parsed.data.remitTypeId,
    quantity: parsed.data.quantity,
    amount: optionalAmount(parsed.data.amount),
    description: parsed.data.description || null,
    proof_path: proofPath,
    submitted_by: profile.id,
    target_week_start: parsed.data.targetWeekStart || null,
  });

  if (error) return { ok: false, error: toActionError(error) };

  revalidateRemit();
  return {
    ok: true,
    message: parsed.data.targetWeekStart
      ? "Advance remit logged and waiting on an admin."
      : "Remit logged and waiting on an admin.",
  };
}

export async function retargetRemitWeek(input: {
  id: string;
  targetWeekStart: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({
      id: uuid,
      targetWeekStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid week."),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("remit_logs")
    .update(
      { target_week_start: parsed.data.targetWeekStart },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) {
    return { ok: false, error: "Only an admin can move a remit to another week." };
  }

  revalidateRemit();
  return { ok: true, message: "Remit moved to the selected week." };
}

export async function reviewRemit(input: {
  id: string;
  status: "pending" | "approved" | "rejected";
}): Promise<ActionResult> {
  const parsed = ReviewRemitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

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
  remitTypeId: string;
  quantity: number;
  amount?: number | null;
  description?: string;
}): Promise<ActionResult> {
  const parsed = EditRemitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("remit_logs")
    .update(
      {
        remit_type_id: parsed.data.remitTypeId,
        quantity: parsed.data.quantity,
        amount: optionalAmount(parsed.data.amount),
        description: parsed.data.description || null,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can edit remit entries." };

  revalidateRemit();
  return { ok: true, message: "Remit entry updated and written to the audit log." };
}

/**
 * Delete a remit row. Pending entries can be removed by the member (or the
 * staffer who submitted them). Admins can void any status.
 */
export async function voidRemit(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  const supabase = await createClient();

  const { error, count } = await supabase
    .from("remit_logs")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) {
    return {
      ok: false,
      error:
        "You can only delete your own pending remits. Ask an admin to void approved ones.",
    };
  }

  revalidateRemit();
  return { ok: true, message: "Remit deleted. A copy is kept in the audit log." };
}

export async function createRemitType(input: {
  name: string;
  isWeeklyQuota: boolean;
  quotaAmount?: number | null;
  inventoryItemId?: string | null;
}): Promise<ActionResult> {
  const parsed = RemitTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  if (parsed.data.isWeeklyQuota && !parsed.data.quotaAmount) {
    return { ok: false, error: "Weekly quota types need a quota amount." };
  }

  const supabase = await createClient();

  let inventoryItemId = parsed.data.inventoryItemId || null;

  // Default: same-named stash item so approvals always feed inventory.
  if (!inventoryItemId) {
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("name", parsed.data.name)
      .maybeSingle();

    if (existing?.id) {
      inventoryItemId = existing.id;
    } else {
      const { data: created, error: itemError } = await supabase
        .from("inventory_items")
        .insert({ name: parsed.data.name })
        .select("id")
        .single();
      if (itemError) return { ok: false, error: toActionError(itemError) };
      inventoryItemId = created.id;
    }
  }

  const { error } = await supabase.from("remit_types").insert({
    name: parsed.data.name,
    is_weekly_quota: parsed.data.isWeeklyQuota,
    quota_amount: parsed.data.isWeeklyQuota ? parsed.data.quotaAmount : null,
    inventory_item_id: inventoryItemId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That type name is already taken." };
    }
    return { ok: false, error: toActionError(error) };
  }

  revalidateRemit();
  return { ok: true, message: `Added ${parsed.data.name}.` };
}

export async function updateRemitType(input: {
  id: string;
  name: string;
  isWeeklyQuota: boolean;
  quotaAmount?: number | null;
  inventoryItemId?: string | null;
}): Promise<ActionResult> {
  const parsed = RemitTypeSchema.extend({ id: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  if (parsed.data.isWeeklyQuota && !parsed.data.quotaAmount) {
    return { ok: false, error: "Weekly quota types need a quota amount." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("remit_types")
    .update(
      {
        name: parsed.data.name,
        is_weekly_quota: parsed.data.isWeeklyQuota,
        quota_amount: parsed.data.isWeeklyQuota ? parsed.data.quotaAmount : null,
        inventory_item_id: parsed.data.inventoryItemId || null,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That type name is already taken." };
    }
    return { ok: false, error: toActionError(error) };
  }
  if (!count) return { ok: false, error: "Only an admin can edit remit types." };

  revalidateRemit();
  return { ok: true, message: `Updated ${parsed.data.name}.` };
}

export async function deleteRemitType(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid type." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("remit_types")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "That type is still used on remit logs." };
    }
    return { ok: false, error: toActionError(error) };
  }
  if (!count) return { ok: false, error: "Only an admin can delete remit types." };

  revalidateRemit();
  return { ok: true, message: "Remit type removed." };
}
