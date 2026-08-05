import { SiteHeader } from "@/components/nav/site-header";
import { requireSession } from "@/lib/auth";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t">
        <div className="text-muted-foreground/60 mx-auto max-w-7xl px-4 py-5 text-xs sm:px-6">
          Vanta Portal · every edit is recorded in the audit log
        </div>
      </footer>
    </div>
  );
}
