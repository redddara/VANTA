"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Pick a value from the list.");

const quantity = z
  .number({ error: "Enter a quantity." })
  .int("Quantity must be a whole number.")
  .positive("Quantity must be greater than zero.")
  .max(100_000, "That quantity is too large.");

const ItemSchema = z.object({
  name: z.string().trim().min(1, "Give the item a name.").max(80),
  isActive: z.boolean(),
});

const MovementSchema = z.object({
  itemId: uuid,
  direction: z.enum(["inbound", "outbound"]),
  quantity,
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters.")
    .optional(),
  memberId: uuid.optional().nullable(),
});

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/admin/audit");
}

export async function createInventoryItem(input: {
  name: string;
  isActive?: boolean;
}): Promise<ActionResult> {
  const parsed = ItemSchema.safeParse({
    name: input.name,
    isActive: input.isActive ?? true,
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert({
    name: parsed.data.name,
    is_active: parsed.data.isActive,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That item name is already taken." };
    }
    return { ok: false, error: toActionError(error) };
  }

  revalidateInventory();
  return { ok: true, message: `Added ${parsed.data.name}.` };
}

export async function updateInventoryItem(input: {
  id: string;
  name: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const parsed = ItemSchema.extend({ id: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("inventory_items")
    .update(
      {
        name: parsed.data.name,
        is_active: parsed.data.isActive,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That item name is already taken." };
    }
    return { ok: false, error: toActionError(error) };
  }
  if (!count) return { ok: false, error: "Only an admin can edit inventory items." };

  revalidateInventory();
  return { ok: true, message: `Updated ${parsed.data.name}.` };
}

export async function deleteInventoryItem(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("inventory_items")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "This item has movements. Retire it instead of deleting.",
      };
    }
    return { ok: false, error: toActionError(error) };
  }
  if (!count) return { ok: false, error: "Only an admin can delete inventory items." };

  revalidateInventory();
  return { ok: true, message: "Item deleted." };
}

export async function logInventoryMovement(input: {
  itemId: string;
  direction: "inbound" | "outbound";
  quantity: number;
  note?: string;
  memberId?: string | null;
}): Promise<ActionResult> {
  const parsed = MovementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Sign in again to log inventory." };

  const { error } = await supabase.from("inventory_movements").insert({
    item_id: parsed.data.itemId,
    direction: parsed.data.direction,
    quantity: parsed.data.quantity,
    note: parsed.data.note || null,
    member_id: parsed.data.memberId || null,
    created_by: userData.user.id,
  });

  if (error) {
    if (error.message?.includes("Not enough stock")) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: toActionError(error) };
  }

  revalidateInventory();
  return {
    ok: true,
    message:
      parsed.data.direction === "inbound"
        ? "Inbound logged."
        : "Outbound logged.",
  };
}

export async function voidInventoryMovement(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("inventory_movements")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) {
    return { ok: false, error: "Only an admin can void inventory movements." };
  }

  revalidateInventory();
  return { ok: true, message: "Movement voided. A copy is kept in the audit log." };
}
