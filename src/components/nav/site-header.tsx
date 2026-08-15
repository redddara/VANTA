import Link from "next/link";

import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";
import { MobileNav } from "@/components/nav/mobile-nav";
import { RankBadge } from "@/components/nav/rank-badge";
import { UserMenu } from "@/components/nav/user-menu";
import { displayName } from "@/lib/display";
import type { NavItem } from "@/lib/nav";
import type { Profile } from "@/lib/types/app";

/** Compact top bar for small screens; desktop navigation lives in SideNav. */
export function SiteHeader({
  profile,
  items,
}: {
  profile: Profile;
  items: NavItem[];
}) {
  const name = displayName(profile);

  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b lg:hidden">
      <div className="flex h-20 items-center gap-2 px-4">
        <MobileNav items={items} memberName={name} />

        <Link
          href="/dashboard"
          className="inline-flex h-full items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <VantaCrest size="md" priority />
          <VantaWordmark className="text-xl" />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <RankBadge rank={profile.crew_rank} className="hidden sm:inline-flex" />
          <UserMenu profile={profile} name={name} />
        </div>
      </div>
    </header>
  );
}
