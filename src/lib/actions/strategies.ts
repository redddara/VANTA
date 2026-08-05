"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Pick a value from the list.");

const CategorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name.").max(80),
  sortOrder: z
    .number({ error: "Enter a sort order." })
    .int()
    .min(0)
    .max(10_000),
});

const StrategySchema = z.object({
  categoryId: uuid,
  title: z.string().trim().min(1, "Give the strategy a title.").max(120),
  description: z
    .string()
    .trim()
    .max(4000, "Keep the description under 4000 characters.")
    .optional()
    .nullable(),
  videoUrl: z
    .string()
    .trim()
    .max(500, "Keep the video URL under 500 characters.")
    .optional()
    .nullable()
    .refine(
      (value) => {
        if (value == null || value === "") return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Enter a valid URL." },
    ),
});

function revalidateStrategies() {
  revalidatePath("/strategies");
  revalidatePath("/admin/audit");
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function createStrategyCategory(input: {
  name: string;
  sortOrder: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("strategy_categories").insert({
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
  });
  if (error) return { ok: false, error: toActionError(error) };

  revalidateStrategies();
  return { ok: true, message: "Category added." };
}

export async function updateStrategyCategory(input: {
  id: string;
  name: string;
  sortOrder: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = CategorySchema.extend({ id: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("strategy_categories")
    .update(
      { name: parsed.data.name, sort_order: parsed.data.sortOrder },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can edit categories." };

  revalidateStrategies();
  return { ok: true, message: "Category updated." };
}

export async function deleteStrategyCategory(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("strategy_categories")
    .delete({ count: "exact" })
    .eq("id", parsed.data);
  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can delete categories." };

  revalidateStrategies();
  return { ok: true, message: "Category removed (and its strategies)." };
}

export async function createStrategy(input: {
  categoryId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
}): Promise<ActionResult> {
  const { profile } = await requireAdmin();
  const parsed = StrategySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("strategies").insert({
    category_id: parsed.data.categoryId,
    title: parsed.data.title,
    description: emptyToNull(parsed.data.description),
    video_url: emptyToNull(parsed.data.videoUrl),
    created_by: profile.id,
    updated_by: profile.id,
  });
  if (error) return { ok: false, error: toActionError(error) };

  revalidateStrategies();
  return { ok: true, message: "Strategy added." };
}

export async function updateStrategy(input: {
  id: string;
  categoryId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
}): Promise<ActionResult> {
  const { profile } = await requireAdmin();
  const parsed = StrategySchema.extend({ id: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("strategies")
    .update(
      {
        category_id: parsed.data.categoryId,
        title: parsed.data.title,
        description: emptyToNull(parsed.data.description),
        video_url: emptyToNull(parsed.data.videoUrl),
        updated_by: profile.id,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can edit strategies." };

  revalidateStrategies();
  return { ok: true, message: "Strategy updated." };
}

export async function deleteStrategy(id: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("strategies")
    .delete({ count: "exact" })
    .eq("id", parsed.data);
  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can delete strategies." };

  revalidateStrategies();
  return { ok: true, message: "Strategy deleted." };
}
