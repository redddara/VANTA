"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";
import { RankBadge } from "@/components/nav/rank-badge";
import { UserMenu } from "@/components/nav/user-menu";
import { displayName } from "@/lib/display";
import {
  isActivePath,
  NAV_GROUP_LABELS,
  type NavItem,
} from "@/lib/nav";
import type { Profile } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function SideNav({
  profile,
  items,
}: {
  profile: Profile;
  items: NavItem[];
}) {
  const pathname = usePathname();
  const name = displayName(profile);

  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="border-border/80 bg-card/40 hidden w-60 shrink-0 flex-col border-r lg:flex">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <VantaCrest size="sm" priority />
          <VantaWordmark className="text-base" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        {Object.entries(groups).map(([group, groupItems]) => (
          <div key={group} className="mb-5 last:mb-0">
            <p className="text-muted-foreground/70 px-2 pb-2 text-[0.65rem] font-semibold tracking-widest uppercase">
              {NAV_GROUP_LABELS[group as NavItem["group"]]}
            </p>
            <div className="flex flex-col gap-0.5">
              {groupItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/12 text-primary border-primary border-l-2 pl-[calc(0.625rem-2px)]"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <RankBadge rank={profile.crew_rank} className="mt-1" />
        </div>
        <UserMenu profile={profile} name={name} />
      </div>
    </aside>
  );
}
