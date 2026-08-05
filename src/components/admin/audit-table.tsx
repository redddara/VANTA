"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ScrollText, Search } from "lucide-react";

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
import {
  describeAction,
  extractChanges,
  extractDeleted,
  extractSubject,
  fieldLabel,
  type AuditTone,
} from "@/lib/audit";
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

  if (deleted) {
    const summary = Object.entries(deleted)
      .filter(([key]) => !key.endsWith("_id") && key !== "id")
      .map(([key, value]) => `${fieldLabel(key)}: ${String(value ?? "\u2014")}`)
      .join(" · ");

    return (
      <p className="text-muted-foreground text-xs wrap-break-word">{summary}</p>
    );
  }

  if (changes.length === 0) {
    return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
  }

  return (
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
  );
}

export function AuditTable({ entries }: { entries: AuditLogEntryWithActor[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<string>("all");

  const actions = useMemo(() => {
    const unique = new Set(entries.map((entry) => entry.action));
    return ["all", ...Array.from(unique).sort()];
  }, [entries]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return entries
      .filter((entry) => (action === "all" ? true : entry.action === action))
      .filter((entry) => {
        if (!needle) return true;
        const haystack = [
          entry.actor ? displayName(entry.actor) : "",
          extractSubject(entry.detail) ?? "",
          entry.action,
          describeAction(entry.action).label,
          JSON.stringify(entry.detail ?? {}),
        ].join(" ");
        return haystack.toLowerCase().includes(needle);
      });
  }, [entries, query, action]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actor, member or value"
            aria-label="Search the audit log"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {actions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAction(value)}
              aria-pressed={action === value}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                action === value
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "all" ? "All actions" : describeAction(value).label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={query || action !== "all" ? "No matching events" : "Nothing logged yet"}
            description={
              query || action !== "all"
                ? "Try a different search or action filter."
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
                      {subject && (
                        <p className="text-muted-foreground mt-1.5 text-xs">
                          {subject}
                        </p>
                      )}
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

      <p className="text-muted-foreground mt-3 text-xs">
        Showing {visible.length} of {entries.length} events
      </p>
    </>
  );
}
