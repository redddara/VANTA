"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";
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
    <aside className="border-border/80 bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r lg:flex">
      <div className="flex h-20 shrink-0 items-center border-b px-4">
        <Link
          href="/dashboard"
          className="inline-flex h-full items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <VantaCrest size="md" priority />
          <VantaWordmark className="text-xl" />
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Main">
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
                      "rounded-md px-2.5 py-2 text-sm font-medium",
                      "border-l-2 border-transparent pl-[calc(0.625rem-2px)]",
                      "transition-[color,background-color,border-color,transform] duration-200 ease-out",
                      active
                        ? "bg-primary/12 text-primary border-primary"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:translate-x-0.5",
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

      <div className="shrink-0 border-t p-2">
        <UserMenu profile={profile} name={name} layout="sidebar" />
      </div>
    </aside>
  );
}
