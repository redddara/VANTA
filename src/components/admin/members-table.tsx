"use client";

import { useMemo, useState } from "react";
import { Pencil, Search, Users } from "lucide-react";

import { MemberEditorDialog } from "@/components/admin/member-editor-dialog";
import { RoleBadge } from "@/components/nav/role-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatMoney } from "@/lib/format";
import type { MemberSummary } from "@/lib/types/app";
import { cn } from "@/lib/utils";

type Filter = "active" | "inactive" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

export function MembersTable({
  members,
  currentUserId,
}: {
  members: MemberSummary[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [editing, setEditing] = useState<MemberSummary | null>(null);

  const counts = useMemo(
    () => ({
      active: members.filter((m) => m.is_active).length,
      inactive: members.filter((m) => !m.is_active).length,
      all: members.length,
    }),
    [members],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return members
      .filter((m) =>
        filter === "all" ? true : filter === "active" ? m.is_active : !m.is_active,
      )
      .filter((m) =>
        needle
          ? [m.ingame_name, m.discord_username, m.crew_rank, m.role]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(needle))
          : true,
      )
      .sort((a, b) => displayName(a).localeCompare(displayName(b), undefined, {
        sensitivity: "base",
      }));
  }, [members, query, filter]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            aria-label="Search members"
            className="pl-9"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by status"
          className="bg-secondary/60 inline-flex w-fit rounded-lg p-[3px]"
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
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span className="text-muted-foreground/70 ml-1.5 text-xs">
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members match"
            description="Try a different search or status filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Rank</TableHead>
                <TableHead className="hidden sm:table-cell">Role</TableHead>
                <TableHead className="text-right">Rep</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Approved remit
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((member) => {
                const rep = Number(member.total_rep);

                return (
                  <TableRow
                    key={member.id}
                    className={cn(!member.is_active && "opacity-55")}
                  >
                    <TableCell>
                      <PersonCell
                        person={member}
                        subtitle={member.discord_username}
                      />
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
                        <Badge variant="secondary" className="text-[0.7rem]">
                          {member.crew_rank ?? "Recruit"}
                        </Badge>
                        <RoleBadge role={member.role} />
                        {!member.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">
                        {member.crew_rank ?? "Recruit"}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <RoleBadge role={member.role} />
                        {!member.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell
                      className={cn(
                        "tabular text-right font-semibold",
                        rep > 0 && "text-[var(--success)]",
                        rep < 0 && "text-destructive",
                      )}
                    >
                      {rep > 0 ? `+${rep}` : rep}
                    </TableCell>

                    <TableCell className="tabular text-muted-foreground hidden text-right lg:table-cell">
                      {formatMoney(member.total_approved_remit)}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(member)}
                        aria-label={`Edit ${displayName(member)}`}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <MemberEditorDialog
        member={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        isSelf={editing?.id === currentUserId}
      />
    </>
  );
}
