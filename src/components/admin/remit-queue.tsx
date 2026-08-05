"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Inbox,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { RemitEditDialog } from "@/components/admin/remit-edit-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reviewRemit, voidRemit } from "@/lib/actions/remit";
import { displayName } from "@/lib/display";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { RemitLogWithPeople, RemitStatus } from "@/lib/types/app";
import { cn } from "@/lib/utils";

type Filter = RemitStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function RemitQueue({ entries }: { entries: RemitLogWithPeople[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [editing, setEditing] = useState<RemitLogWithPeople | null>(null);
  const [voiding, setVoiding] = useState<RemitLogWithPeople | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      pending: entries.filter((e) => e.status === "pending").length,
      approved: entries.filter((e) => e.status === "approved").length,
      rejected: entries.filter((e) => e.status === "rejected").length,
      all: entries.length,
    }),
    [entries],
  );

  const visible = useMemo(
    () =>
      filter === "all" ? entries : entries.filter((e) => e.status === filter),
    [entries, filter],
  );

  function review(entry: RemitLogWithPeople, status: RemitStatus) {
    setBusyId(entry.id);

    startTransition(async () => {
      const result = await reviewRemit({ id: entry.id, status });
      setBusyId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <>
      <div
        role="group"
        aria-label="Filter by status"
        className="bg-secondary/60 mb-4 inline-flex w-full rounded-lg p-[3px] sm:w-fit"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none",
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

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={
              filter === "pending"
                ? "Nothing waiting for review"
                : "No entries here"
            }
            description={
              filter === "pending"
                ? "Remit submitted by officers lands here for approval."
                : "Try a different status filter."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead className="hidden md:table-cell">Submitted by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-px text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((entry) => {
                const busy = busyId === entry.id;

                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <PersonCell person={entry.member} />
                      <p className="text-muted-foreground mt-1 text-xs">
                        <time
                          dateTime={entry.created_at}
                          title={formatDateTime(entry.created_at)}
                        >
                          {formatRelative(entry.created_at)}
                        </time>
                      </p>
                    </TableCell>

                    <TableCell className="tabular text-right font-medium whitespace-nowrap">
                      {formatMoney(entry.amount)}
                    </TableCell>

                    <TableCell className="hidden max-w-xs lg:table-cell">
                      <p className="text-muted-foreground text-sm break-words">
                        {entry.description || "\u2014"}
                      </p>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <PersonCell person={entry.submitter} compact />
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={entry.status as RemitStatus} />
                      {entry.reviewer && entry.status !== "pending" && (
                        <p className="text-muted-foreground/70 mt-1 text-xs">
                          by {displayName(entry.reviewer)}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => review(entry, "approved")}
                              className="text-[var(--success)] hover:text-[var(--success)]"
                            >
                              {busy ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Check />
                              )}
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => review(entry, "rejected")}
                              className="text-destructive hover:text-destructive"
                            >
                              <X />
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                          </>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={busy}>
                              <MoreHorizontal />
                              <span className="sr-only">More actions</span>
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(entry)}>
                              <Pencil />
                              Edit entry
                            </DropdownMenuItem>

                            {entry.status !== "pending" && (
                              <DropdownMenuItem
                                onSelect={() => review(entry, "pending")}
                              >
                                <RotateCcw />
                                Move back to pending
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setVoiding(entry)}
                            >
                              <Trash2 />
                              Void entry
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <RemitEditDialog
        entry={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={voiding !== null}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Void this remit entry?"
        destructive
        confirmLabel="Void entry"
        description={
          voiding ? (
            <>
              {formatMoney(voiding.amount)} credited to{" "}
              <span className="text-foreground font-medium">
                {displayName(voiding.member ?? {})}
              </span>{" "}
              will be removed. A full copy is kept in the audit log, but the
              entry itself cannot be restored.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!voiding) return;
          const result = await voidRemit(voiding.id);

          if (!result.ok) {
            toast.error(result.error);
            return;
          }

          toast.success(result.message);
          setVoiding(null);
          router.refresh();
        }}
      />
    </>
  );
}
