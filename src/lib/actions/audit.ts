"use server";

import { z } from "zod";

import { AUDIT_PAGE_SIZE } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth";
import { AUDIT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntryWithActor } from "@/lib/types/app";

const FetchSchema = z.object({
  action: z.string().trim().min(1).max(80).optional().nullable(),
  before: z.string().datetime({ offset: true }).optional().nullable(),
});

export type AuditPageResult = {
  entries: AuditLogEntryWithActor[];
  nextCursor: string | null;
};

/** Newest-first page of the append-only audit log. */
export async function fetchAuditPage(input: {
  action?: string | null;
  before?: string | null;
}): Promise<AuditPageResult> {
  await requireAdmin();
  const parsed = FetchSchema.safeParse(input);
  if (!parsed.success) return { entries: [], nextCursor: null };

  const supabase = await createClient();
  const action =
    parsed.data.action && parsed.data.action !== "all"
      ? parsed.data.action
      : null;

  let query = supabase
    .from("audit_log")
    .select(AUDIT_SELECT)
    .order("created_at", { ascending: false })
    .limit(AUDIT_PAGE_SIZE + 1);

  if (action) query = query.eq("action", action);
  if (parsed.data.before) query = query.lt("created_at", parsed.data.before);

  const { data, error } = await query.returns<AuditLogEntryWithActor[]>();
  if (error || !data) return { entries: [], nextCursor: null };

  const hasMore = data.length > AUDIT_PAGE_SIZE;
  const entries = hasMore ? data.slice(0, AUDIT_PAGE_SIZE) : data;
  const nextCursor = hasMore
    ? (entries[entries.length - 1]?.created_at ?? null)
    : null;

  return { entries, nextCursor };
}
