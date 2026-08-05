import { SideNav } from "@/components/nav/side-nav";
import { SiteHeader } from "@/components/nav/site-header";
import { requireSession } from "@/lib/auth";
import { visibleNavItems } from "@/lib/nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireSession();
  const items = visibleNavItems(profile.crew_rank);

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
    </div>
  );
}
