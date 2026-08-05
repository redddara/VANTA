import Link from "next/link";

import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";
import { MobileNav } from "@/components/nav/mobile-nav";
import { NavLinks } from "@/components/nav/nav-links";
import { RoleBadge } from "@/components/nav/role-badge";
import { UserMenu } from "@/components/nav/user-menu";
import { displayName } from "@/lib/display";
import { visibleNavItems } from "@/lib/nav";
import type { Profile } from "@/lib/types/app";

export function SiteHeader({ profile }: { profile: Profile }) {
  const items = visibleNavItems(profile.role);
  const name = displayName(profile);

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <MobileNav items={items} memberName={name} />

        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <VantaCrest size="sm" priority />
          <VantaWordmark className="text-base" />
        </Link>

        <span aria-hidden className="bg-border mx-2 hidden h-5 w-px lg:block" />

        <NavLinks items={items} />

        <div className="ml-auto flex items-center gap-2">
          {profile.role !== "member" && (
            <RoleBadge role={profile.role} className="hidden sm:inline-flex" />
          )}
          <UserMenu profile={profile} name={name} />
        </div>
      </div>
    </header>
  );
}
