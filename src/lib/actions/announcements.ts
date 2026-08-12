"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { ANNOUNCEMENT_AUDIENCES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid("Unknown announcement.");

const AnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the update a title.")
    .max(120, "Keep the title under 120 characters."),
  body: z
    .string()
    .trim()
    .min(1, "Write what members need to know.")
    .max(2000, "Keep the message under 2000 characters."),
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  isActive: z.boolean(),
});

function revalidateAnnouncements() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/audit");
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: (typeof ANNOUNCEMENT_AUDIENCES)[number];
  isActive?: boolean;
}): Promise<ActionResult> {
  const parsed = AnnouncementSchema.safeParse({
    title: input.title,
    body: input.body,
    audience: input.audience,
    isActive: input.isActive ?? true,
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Sign in again to post an update." };

  const { error } = await supabase.from("site_announcements").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    audience: parsed.data.audience,
    is_active: parsed.data.isActive,
    created_by: userData.user.id,
  });

  if (error) return { ok: false, error: toActionError(error) };

  revalidateAnnouncements();
  return { ok: true, message: "Update posted. Members will see it once." };
}

export async function updateAnnouncement(input: {
  id: string;
  title: string;
  body: string;
  audience: (typeof ANNOUNCEMENT_AUDIENCES)[number];
  isActive: boolean;
}): Promise<ActionResult> {
  const parsed = AnnouncementSchema.extend({ id: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("site_announcements")
    .update(
      {
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        is_active: parsed.data.isActive,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can edit updates." };

  revalidateAnnouncements();
  return { ok: true, message: "Update saved." };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("site_announcements")
    .delete({ count: "exact" })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: toActionError(error) };
  if (!count) return { ok: false, error: "Only an admin can delete updates." };

  revalidateAnnouncements();
  return { ok: true, message: "Update deleted." };
}

export async function dismissAnnouncement(id: string): Promise<ActionResult> {
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Sign in again." };

  const { error } = await supabase.from("site_announcement_dismissals").insert({
    announcement_id: parsed.data,
    member_id: userData.user.id,
  });

  if (error) {
    // Already dismissed — treat as success so the popup closes.
    if (error.code === "23505") {
      revalidateAnnouncements();
      return { ok: true, message: "Got it." };
    }
    return { ok: false, error: toActionError(error) };
  }

  revalidateAnnouncements();
  return { ok: true, message: "Got it." };
}
