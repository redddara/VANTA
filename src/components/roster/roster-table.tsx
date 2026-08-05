"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Users } from "lucide-react";

import { CraftingUnlockBadges } from "@/components/reputation/crafting-unlocks";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { RankBadge } from "@/components/nav/rank-badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { displayName } from "@/lib/display";
import { formatDate, formatMoney } from "@/lib/format";
import { rankWeight, type MemberSummary } from "@/lib/types/app";
import { cn } from "@/lib/utils";

type SortKey = "name" | "rank" | "tier" | "remit" | "joined";
type Direction = "asc" | "desc";

const DEFAULT_DIRECTION: Record<SortKey, Direction> = {
  name: "asc",
  rank: "desc",
  tier: "desc",
  remit: "desc",
  joined: "asc",
};

function compare(a: MemberSummary, b: MemberSummary, key: SortKey): number {
  switch (key) {
    case "name":
      return displayName(a).localeCompare(displayName(b), undefined, {
        sensitivity: "base",
      });
    case "rank":
      return rankWeight(a.crew_rank) - rankWeight(b.crew_rank);
    case "tier":
      return (a.tier_level_order ?? -1) - (b.tier_level_order ?? -1);
    case "remit":
      return Number(a.total_approved_remit) - Number(b.total_approved_remit);
    case "joined":
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }
}

function SortableHead({
  label,
  sortKey,
  active,
  direction,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  direction: Direction;
  onSort: (key: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={cn(align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "hover:text-foreground focus-visible:ring-ring -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}

export function RosterTable({ members }: { members: MemberSummary[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tier");
  const [direction, setDirection] = useState<Direction>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(DEFAULT_DIRECTION[key]);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = needle
      ? members.filter((m) =>
          [m.ingame_name, m.discord_username, m.crew_rank, m.tier_label]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(needle)),
        )
      : members;

    return [...filtered].sort((a, b) => {
      const result = compare(a, b, sortKey);
      return direction === "asc" ? result : -result;
    });
  }, [members, query, sortKey, direction]);

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, rank or tier"
          aria-label="Search the roster"
          className="pl-9"
        />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "No members match that search" : "The roster is empty"}
            description={
              query
                ? "Try a different name, rank or tier."
                : "Members appear here the first time they sign in with Discord."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="Member"
                  sortKey="name"
                  active={sortKey === "name"}
                  direction={direction}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Rank"
                  sortKey="rank"
                  active={sortKey === "rank"}
                  direction={direction}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                />
                <SortableHead
                  label="Rep tier"
                  sortKey="tier"
                  active={sortKey === "tier"}
                  direction={direction}
                  onSort={handleSort}
                />
                <SortableHead
                  label="Remit"
                  sortKey="remit"
                  active={sortKey === "remit"}
                  direction={direction}
                  onSort={handleSort}
                  align="right"
                  className="hidden md:table-cell"
                />
                <SortableHead
                  label="Joined"
                  sortKey="joined"
                  active={sortKey === "joined"}
                  direction={direction}
                  onSort={handleSort}
                  align="right"
                  className="hidden lg:table-cell"
                />
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <PersonCell person={member} />
                    <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                      <RankBadge rank={member.crew_rank} />
                    </div>
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    <RankBadge rank={member.crew_rank} />
                  </TableCell>

                  <TableCell>
                    {member.tier_label ? (
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">{member.tier_label}</p>
                        <CraftingUnlockBadges
                          tier={member}
                          className="hidden lg:flex"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  <TableCell className="tabular text-muted-foreground hidden text-right md:table-cell">
                    {formatMoney(member.total_approved_remit)}
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden text-right text-xs whitespace-nowrap lg:table-cell">
                    {formatDate(member.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        Showing {visible.length} of {members.length} active{" "}
        {members.length === 1 ? "member" : "members"}
      </p>
    </div>
  );
}
