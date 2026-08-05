"use client";

import { useMemo, useState } from "react";
import { Check, Search, Users, X } from "lucide-react";

import { RankBadge } from "@/components/nav/rank-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { Badge } from "@/components/ui/badge";
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
import type { WeeklyCompliance } from "@/lib/types/app";
import { cn } from "@/lib/utils";

type Filter = "all" | "met" | "missing";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "missing", label: "Missing" },
  { value: "met", label: "Met" },
  { value: "all", label: "All" },
];

export function ComplianceTable({ rows }: { rows: WeeklyCompliance[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("missing");

  const counts = useMemo(
    () => ({
      missing: rows.filter((r) => !r.quota_met).length,
      met: rows.filter((r) => r.quota_met).length,
      all: rows.length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((r) =>
        filter === "all" ? true : filter === "met" ? r.quota_met : !r.quota_met,
      )
      .filter((r) =>
        needle
          ? [r.ingame_name, r.discord_username, r.crew_rank]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(needle))
          : true,
      )
      .sort((a, b) => {
        if (a.quota_met !== b.quota_met) return a.quota_met ? 1 : -1;
        return displayName(a).localeCompare(displayName(b), undefined, {
          sensitivity: "base",
        });
      });
  }, [rows, query, filter]);

  const quota = rows[0]?.quota_amount ?? 2;
  const typeName = rows[0]?.quota_type_name ?? "Laundering Contract";

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            aria-label="Search compliance"
            className="pl-9"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by quota status"
          className="bg-secondary/60 inline-flex w-fit rounded-lg p-0.75"
        >
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span className="text-muted-foreground ml-1.5 tabular text-xs">
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground mb-3 text-sm">
        This week&apos;s quota: <span className="text-foreground font-medium">{quota}</span>{" "}
        approved {typeName}
        {quota === 1 ? "" : "s"} per active member. Resets every Sunday (Manila time).
      </p>

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query || filter !== "all" ? "No members match" : "No active members"}
            description={
              filter === "missing"
                ? "Everyone has met the quota this week."
                : "Try a different filter or search."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Rank</TableHead>
                <TableHead className="text-right">This week</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.member_id}>
                  <TableCell>
                    <PersonCell
                      person={{
                        id: row.member_id,
                        ingame_name: row.ingame_name,
                        discord_username: row.discord_username,
                        discord_avatar_url: row.discord_avatar_url,
                      }}
                    />
                    <div className="mt-1.5 sm:hidden">
                      <RankBadge rank={row.crew_rank} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <RankBadge rank={row.crew_rank} />
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">
                    {row.approved_quantity}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      / {row.quota_amount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.quota_met ? (
                      <Badge className="bg-success/15 text-success border-success/30 gap-1 border">
                        <Check className="size-3" />
                        Met
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-destructive/40 text-destructive gap-1"
                      >
                        <X className="size-3" />
                        Missing
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
