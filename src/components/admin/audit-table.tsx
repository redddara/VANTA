"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Loader2, ScrollText, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
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
import { fetchAuditPage } from "@/lib/actions/audit";
import {
  AUDIT_ACTION_FILTERS,
  describeAction,
  extractChanges,
  extractDeleted,
  extractInventorySummary,
  extractRemitReviewSummary,
  extractSubject,
  fieldLabel,
  type AuditTone,
} from "@/lib/audit";
import { displayName } from "@/lib/display";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { AuditLogEntryWithActor } from "@/lib/types/app";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<AuditTone, string> = {
  neutral: "border-border text-muted-foreground",
  positive: "border-success/35 text-success",
  negative: "border-destructive/40 text-destructive",
  warning: "border-warning/35 text-warning",
};

function ChangeList({ entry }: { entry: AuditLogEntryWithActor }) {
  const changes = extractChanges(entry.detail);
  const deleted = extractDeleted(entry.detail);
  const remitSummary = extractRemitReviewSummary(entry.detail);
  const inventorySummary = extractInventorySummary(entry.detail);
  const snapshot = remitSummary ?? inventorySummary;

  if (deleted) {
    const summary = Object.entries(deleted)
      .filter(([key]) => !key.endsWith("_id") && key !== "id")
      .map(([key, value]) => `${fieldLabel(key)}: ${String(value ?? "\u2014")}`)
      .join(" · ");

    return (
      <p className="text-muted-foreground text-xs wrap-break-word">{summary}</p>
    );
  }

  if (changes.length === 0 && !snapshot) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }

  return (
    <div className="space-y-1.5">
      {snapshot ? (
        <p className="text-foreground text-xs font-medium">{snapshot}</p>
      ) : null}
      {changes.length > 0 ? (
        <ul className="space-y-1">
          {changes.map((change) => (
            <li
              key={change.field}
              className="flex flex-wrap items-center gap-1.5 text-xs"
            >
              <span className="text-muted-foreground">{fieldLabel(change.field)}</span>
              <span className="text-muted-foreground/60 line-through">
                {change.from}
              </span>
              <ArrowRight className="text-muted-foreground/50 size-3" />
              <span className="text-foreground font-medium">{change.to}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AuditTable({
  initialEntries,
  initialCursor,
  initialAction = "all",
}: {
  initialEntries: AuditLogEntryWithActor[];
  initialCursor: string | null;
  initialAction?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState(initialAction);
  const [entries, setEntries] = useState(initialEntries);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setEntries(initialEntries);
    setNextCursor(initialCursor);
    setAction(initialAction);
  }, [initialEntries, initialCursor, initialAction]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter((entry) => {
      const haystack = [
        entry.actor ? displayName(entry.actor) : "",
        extractSubject(entry.detail) ?? "",
        entry.action,
        describeAction(entry.action).label,
        JSON.stringify(entry.detail ?? {}),
      ].join(" ");
      return haystack.toLowerCase().includes(needle);
    });
  }, [entries, query]);

  function onActionChange(next: string) {
    setAction(next);
    setQuery("");
    const params = new URLSearchParams();
    if (next !== "all") params.set("action", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function loadOlder() {
    if (!nextCursor || pending) return;

    startTransition(async () => {
      const page = await fetchAuditPage({
        action: action === "all" ? null : action,
        before: nextCursor,
      });
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...page.entries.filter((e) => !seen.has(e.id))];
      });
      setNextCursor(page.nextCursor);
    });
  }

  return (
    <>
      <div className="bg-card mb-4 space-y-3 rounded-xl border p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actor, member, or value in loaded events"
              aria-label="Search the audit log"
              className="pl-9"
            />
          </div>

          <Select value={action} onValueChange={onActionChange}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Filter by action">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {AUDIT_ACTION_FILTERS.map((value) => (
                <SelectItem key={value} value={value}>
                  {describeAction(value).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-muted-foreground text-xs">
          Newest first · 50 events per load · text search runs on what is loaded
          below (use Load older for history).
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={query || action !== "all" ? "No matching events" : "Nothing logged yet"}
            description={
              query
                ? "Try a different search, clear it, or load older events."
                : action !== "all"
                  ? "No events of this type in the loaded window."
                  : "Role changes, remit reviews, edits and voids all appear here automatically."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead className="hidden sm:table-cell">Actor</TableHead>
                <TableHead>Change</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((entry) => {
                const meta = describeAction(entry.action);
                const subject = extractSubject(entry.detail);

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="align-top">
                      <Badge variant="outline" className={TONE_CLASS[meta.tone]}>
                        {meta.label}
                      </Badge>
                      {subject ? (
                        <p className="text-muted-foreground mt-1.5 text-xs">
                          {subject}
                        </p>
                      ) : null}
                      <div className="mt-1.5 sm:hidden">
                        <PersonCell person={entry.actor} compact />
                      </div>
                    </TableCell>

                    <TableCell className="hidden align-top sm:table-cell">
                      <PersonCell person={entry.actor} compact />
                    </TableCell>

                    <TableCell className="max-w-sm align-top">
                      <ChangeList entry={entry} />
                    </TableCell>

                    <TableCell className="text-muted-foreground align-top text-right text-xs whitespace-nowrap">
                      <time
                        dateTime={entry.created_at}
                        title={formatDateTime(entry.created_at)}
                      >
                        {formatRelative(entry.created_at)}
                      </time>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          Showing {visible.length}
          {query ? ` match${visible.length === 1 ? "" : "es"} in` : ""}{" "}
          {entries.length} loaded event{entries.length === 1 ? "" : "s"}
        </p>

        {nextCursor ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={loadOlder}
            className={cn("w-full sm:w-auto")}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            Load older events
          </Button>
        ) : entries.length > 0 ? (
          <p className="text-muted-foreground text-xs sm:text-right">
            End of loaded history
          </p>
        ) : null}
      </div>
    </>
  );
}
