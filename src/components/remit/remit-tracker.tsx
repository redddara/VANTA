"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { RankBadge } from "@/components/nav/rank-badge";
import { RemitProofThumb } from "@/components/remit/remit-proof";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { retargetRemitWeek, retargetRemitWeeks } from "@/lib/actions/remit";
import { displayName } from "@/lib/display";
import { formatRelative, formatRemitWeek } from "@/lib/format";
import { monthLabel, shiftMonth } from "@/lib/manila-week";
import type {
  RemitLogWithPeople,
  RemitStatus,
  WeeklyCompliance,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

type Filter = "missing" | "met" | "all";

export function RemitTracker({
  year,
  month,
  weeks,
  selectedWeek,
  compliance,
  history,
  upcomingWeeks,
  canManageAdvance,
}: {
  year: number;
  month: number;
  weeks: string[];
  selectedWeek: string;
  compliance: WeeklyCompliance[];
  history: RemitLogWithPeople[];
  upcomingWeeks: string[];
  canManageAdvance: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("missing");
  const [historyQuery, setHistoryQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transferWeek, setTransferWeek] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const monthSummary = useMemo(() => {
    const byMember = new Map<
      string,
      {
        member: WeeklyCompliance;
        met: number;
        total: number;
      }
    >();

    for (const row of compliance) {
      // Monthly rollup uses only the selected week's snapshot for member list;
      // overall month met-count is approximated from history below.
      void row;
    }

    // Build unique members from compliance rows.
    for (const row of compliance) {
      if (!byMember.has(row.member_id)) {
        byMember.set(row.member_id, {
          member: row,
          met: 0,
          total: 0,
        });
      }
    }

    // Count distinct weeks with all quotas met from history of approved quota remits.
    // Simpler monthly signal: for selected week, how many quota rows are met.
    for (const row of compliance) {
      const entry = byMember.get(row.member_id);
      if (!entry) continue;
      entry.total += 1;
      if (row.quota_met) entry.met += 1;
    }

    return [...byMember.values()].sort((a, b) =>
      displayName(a.member).localeCompare(displayName(b.member), undefined, {
        sensitivity: "base",
      }),
    );
  }, [compliance]);

  const visibleCompliance = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return compliance
      .filter((r) =>
        filter === "all" ? true : filter === "met" ? r.quota_met : !r.quota_met,
      )
      .filter((r) =>
        needle
          ? [
              r.ingame_name,
              r.discord_username,
              r.crew_rank,
              r.quota_type_name,
            ]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(needle))
          : true,
      )
      .sort((a, b) => {
        if (a.quota_met !== b.quota_met) return a.quota_met ? 1 : -1;
        const byName = displayName(a).localeCompare(displayName(b), undefined, {
          sensitivity: "base",
        });
        if (byName !== 0) return byName;
        return a.quota_type_name.localeCompare(b.quota_type_name);
      });
  }, [compliance, filter, query]);

  const visibleHistory = useMemo(() => {
    const needle = historyQuery.trim().toLowerCase();
    return history.filter((entry) => {
      if (!needle) return true;
      const hay = [
        displayName(entry.member ?? {}),
        displayName(entry.submitter ?? {}),
        displayName(entry.reviewer ?? {}),
        entry.remit_type?.name,
        entry.status,
        entry.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [history, historyQuery]);

  const transferWeeks = useMemo(() => {
    return [...new Set([...upcomingWeeks, ...weeks])]
      .filter((week) => week !== selectedWeek)
      .sort();
  }, [upcomingWeeks, weeks, selectedWeek]);

  const allVisibleSelected =
    visibleHistory.length > 0 &&
    visibleHistory.every((entry) => selectedIds.includes(entry.id));

  const counts = {
    missing: compliance.filter((r) => !r.quota_met).length,
    met: compliance.filter((r) => r.quota_met).length,
    all: compliance.length,
  };

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      if (next.length > 0 && !transferWeek) {
        const preferred =
          transferWeeks.find((week) => week > selectedWeek) ??
          transferWeeks[0] ??
          "";
        if (preferred) setTransferWeek(preferred);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      const visible = new Set(visibleHistory.map((entry) => entry.id));
      setSelectedIds((current) => current.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedIds((current) => [
      ...new Set([...current, ...visibleHistory.map((entry) => entry.id)]),
    ]);
    if (!transferWeek) {
      const preferred =
        transferWeeks.find((week) => week > selectedWeek) ??
        transferWeeks[0] ??
        "";
      if (preferred) setTransferWeek(preferred);
    }
  }

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    const params = new URLSearchParams({
      year: String(next.year),
      month: String(next.month),
    });
    setSelectedIds([]);
    setTransferWeek("");
    router.push(`/remit/tracker?${params.toString()}`);
  }

  function goWeek(week: string) {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      week,
    });
    setSelectedIds([]);
    setTransferWeek("");
    router.push(`/remit/tracker?${params.toString()}`);
  }

  async function onRetarget(id: string, week: string) {
    const result = await retargetRemitWeek({ id, targetWeekStart: week });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  async function onBulkTransfer() {
    if (!transferWeek || selectedIds.length === 0) return;
    const result = await retargetRemitWeeks({
      ids: selectedIds,
      targetWeekStart: transferWeek,
    });
    setConfirmTransfer(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setSelectedIds([]);
    setTransferWeek("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => goMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <p className="font-display min-w-40 text-center text-lg tracking-wide uppercase">
            {monthLabel(year, month)}
          </p>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => goMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/remit">Remit queue</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {weeks.map((week) => (
          <button
            key={week}
            type="button"
            onClick={() => goWeek(week)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              week === selectedWeek
                ? "border-primary/40 bg-primary/12 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {formatRemitWeek(week)}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg tracking-wide uppercase">
              Weekly quota
            </h2>
            <p className="text-muted-foreground text-sm">
              Who finished each quota for {formatRemitWeek(selectedWeek)}.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter members"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["missing", `Missing (${counts.missing})`],
              ["met", `Met (${counts.met})`],
              ["all", `All (${counts.all})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                filter === value
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-card overflow-hidden rounded-xl border">
          {visibleCompliance.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No quota rows"
              description="No weekly quota types, or nothing matched the filter."
              className="py-10"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCompliance.map((row) => (
                  <TableRow key={`${row.member_id}:${row.quota_type_id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PersonCell
                          person={{
                            id: row.member_id,
                            ingame_name: row.ingame_name,
                            discord_username: row.discord_username,
                            discord_avatar_url: row.discord_avatar_url,
                          }}
                          compact
                        />
                        <RankBadge rank={row.crew_rank} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.quota_type_name}</TableCell>
                    <TableCell className="tabular text-right text-sm">
                      {row.approved_quantity}/{row.quota_amount}
                    </TableCell>
                    <TableCell>
                      {row.quota_met ? (
                        <Badge
                          variant="outline"
                          className="border-success/35 text-success"
                        >
                          <Check className="size-3" /> Met
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-destructive"
                        >
                          <X className="size-3" /> Short
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-display text-sm tracking-wide uppercase">
            This week overall
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Members with every quota met vs still short.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {monthSummary.map(({ member, met, total }) => (
              <li
                key={member.member_id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <PersonCell
                  person={{
                    id: member.member_id,
                    ingame_name: member.ingame_name,
                    discord_username: member.discord_username,
                    discord_avatar_url: member.discord_avatar_url,
                  }}
                  compact
                />
                <span
                  className={cn(
                    "tabular text-xs font-medium",
                    met === total && total > 0
                      ? "text-success"
                      : "text-muted-foreground",
                  )}
                >
                  {met}/{total} met
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg tracking-wide uppercase">
              Remit history
            </h2>
            <p className="text-muted-foreground text-sm">
              Who remitted, who logged it, who approved — for this week.
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Search history"
              className="pl-9"
            />
          </div>
        </div>

        {canManageAdvance && selectedIds.length > 0 ? (
          <div className="bg-card flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              {selectedIds.length} selected — move to another week
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={transferWeek}
                onValueChange={setTransferWeek}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Destination week" />
                </SelectTrigger>
                <SelectContent>
                  {transferWeeks.map((week) => (
                    <SelectItem key={week} value={week}>
                      {formatRemitWeek(week)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!transferWeek}
                onClick={() => setConfirmTransfer(true)}
              >
                Transfer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedIds([]);
                  setTransferWeek("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        <div className="bg-card overflow-hidden rounded-xl border">
          {visibleHistory.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No remits this week"
              description="Approved and pending entries for this week show up here."
              className="py-10"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canManageAdvance ? (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all visible remits"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        className="accent-primary size-4"
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>Member</TableHead>
                  <TableHead>Remit</TableHead>
                  <TableHead className="w-14">Proof</TableHead>
                  <TableHead className="hidden md:table-cell">Logged by</TableHead>
                  <TableHead className="hidden lg:table-cell">Approved by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">When</TableHead>
                  {canManageAdvance ? (
                    <TableHead className="w-40">Week</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    {canManageAdvance ? (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select remit for ${displayName(entry.member ?? {})}`}
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelected(entry.id)}
                          className="accent-primary size-4"
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <PersonCell person={entry.member} compact />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {entry.quantity}× {entry.remit_type?.name ?? "Remit"}
                      </p>
                      {entry.is_advance ? (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Advance
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {entry.proof_path ? (
                        <RemitProofThumb path={entry.proof_path} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <PersonCell person={entry.submitter} compact />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {entry.reviewer ? (
                        <PersonCell person={entry.reviewer} compact />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.status as RemitStatus} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs">
                      {formatRelative(entry.created_at)}
                    </TableCell>
                    {canManageAdvance ? (
                      <TableCell>
                        <Select
                          value={entry.week_start}
                          onValueChange={(week) => onRetarget(entry.id, week)}
                        >
                          <SelectTrigger size="sm" className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              ...new Set([
                                entry.week_start,
                                selectedWeek,
                                ...upcomingWeeks,
                                ...weeks,
                              ]),
                            ]
                              .sort()
                              .map((week) => (
                                <SelectItem key={week} value={week}>
                                  {formatRemitWeek(week)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmTransfer}
        onOpenChange={setConfirmTransfer}
        title="Transfer remits?"
        description={
          <p>
            Move {selectedIds.length} remit{selectedIds.length === 1 ? "" : "s"}{" "}
            to{" "}
            <span className="text-foreground font-medium">
              {transferWeek ? formatRemitWeek(transferWeek) : "the selected week"}
            </span>
            . Quotas for both weeks will update after the move.
          </p>
        }
        confirmLabel="Transfer"
        onConfirm={onBulkTransfer}
      />
    </div>
  );
}
