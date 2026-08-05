"use client";

import Link from "next/link";
import { ChevronDown, LogOut, User } from "lucide-react";

import { MemberAvatar } from "@/components/nav/member-avatar";
import { RankBadge } from "@/components/nav/rank-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/types/app";

export function UserMenu({
  profile,
  name,
  layout = "header",
}: {
  profile: Profile;
  name: string;
  /** Sidebar uses a full-width trigger so the rank badge never overlaps the avatar. */
  layout?: "header" | "sidebar";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {layout === "sidebar" ? (
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 px-2 py-2 text-left"
          >
            <MemberAvatar profile={profile} className="size-9 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <RankBadge rank={profile.crew_rank} className="mt-1" />
            </span>
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          </Button>
        ) : (
          <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:pr-2.5">
            <MemberAvatar profile={profile} className="size-6 shrink-0" />
            <span className="hidden max-w-28 truncate text-sm sm:inline">
              {name}
            </span>
            <ChevronDown className="text-muted-foreground hidden size-3.5 sm:inline" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={layout === "sidebar" ? "start" : "end"}
        className="w-56"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate">{name}</span>
          <span className="text-muted-foreground text-xs font-normal">
            {profile.crew_rank}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User />
            Profile settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/*
          A form POST rather than a client call: the route handler clears the
          httpOnly cookie server-side, so the session is gone even if JS fails.
        */}
        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full">
            <DropdownMenuItem variant="destructive" asChild>
              <span className="cursor-pointer">
                <LogOut />
                Sign out
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
