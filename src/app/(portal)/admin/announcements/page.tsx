import type { Metadata } from "next";

import {
  AnnouncementsManager,
  type AnnouncementRow,
} from "@/components/admin/announcements-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { SITE_ANNOUNCEMENT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Site updates" };

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("site_announcements")
    .select(SITE_ANNOUNCEMENT_SELECT)
    .order("created_at", { ascending: false })
    .returns<AnnouncementRow[]>();

  return (
    <>
      <PageHeader
        title="Site updates"
        description="Post a popup that tells members or admins what changed. Each person sees an update only once."
      />
      <AnnouncementsManager announcements={data ?? []} />
    </>
  );
}
