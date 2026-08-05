"use client";

import Link from "next/link";
import { ChevronDown, LogOut, User } from "lucide-react";

import { MemberAvatar } from "@/components/nav/member-avatar";
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
}: {
  profile: Profile;
  name: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:pr-2.5">
          <MemberAvatar profile={profile} className="size-6" />
          <span className="hidden max-w-28 truncate text-sm sm:inline">
            {name}
          </span>
          <ChevronDown className="text-muted-foreground hidden size-3.5 sm:inline" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
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
