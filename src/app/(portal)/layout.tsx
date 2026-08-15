import { Suspense } from "react";

import { SiteUpdateDialog } from "@/components/announcements/site-update-dialog";
import { SideNav } from "@/components/nav/side-nav";
import { SiteHeader } from "@/components/nav/site-header";
import { getMyWarehouseAccess, requireSession } from "@/lib/auth";
import { ANNOUNCEMENT_AUDIENCES } from "@/lib/constants";
import { visibleNavItems } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import type { PendingAnnouncement } from "@/lib/types/app";

function isAudience(
  value: string,
): value is PendingAnnouncement["audience"] {
  return (ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(value);
}

async function PendingSiteUpdate() {
  const supabase = await createClient();
  const { data: pendingRows } = await supabase.rpc("vanta_pending_announcements");
  const pending: PendingAnnouncement[] = [];
  for (const row of pendingRows ?? []) {
    if (!isAudience(row.audience)) continue;
    pending.push({
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience,
      created_at: row.created_at,
    });
  }
  const announcement = pending[0] ?? null;

  return (
    <SiteUpdateDialog
      key={announcement?.id ?? "none"}
      announcement={announcement}
    />
  );
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireSession();
  const warehouses = await getMyWarehouseAccess();
  const items = visibleNavItems(profile, warehouses);

  return (
    <div className="min-h-dvh lg:pl-60">
      <SideNav profile={profile} items={items} />

      <div className="flex min-w-0 flex-col">
        <SiteHeader profile={profile} items={items} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t">
          <div className="text-muted-foreground/60 mx-auto max-w-7xl px-4 py-5 text-xs transition-opacity duration-300 sm:px-6">
            Vanta Portal · every edit is recorded in the audit log
          </div>
        </footer>
      </div>

      <Suspense fallback={null}>
        <PendingSiteUpdate />
      </Suspense>
    </div>
  );
}
