"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ReputationEditDialog } from "@/components/admin/reputation-edit-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { RepDelta } from "@/components/shared/rep-delta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { voidReputation } from "@/lib/actions/reputation";
import { displayName } from "@/lib/display";
import { formatDateTime, formatPoints, formatRelative } from "@/lib/format";
import type { ReputationEntryWithPeople } from "@/lib/types/app";

export function ReputationLedger({
  entries,
}: {
  entries: ReputationEntryWithPeople[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ReputationEntryWithPeople | null>(null);
  const [voiding, setVoiding] = useState<ReputationEntryWithPeople | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter((entry) =>
      [
        entry.member ? displayName(entry.member) : "",
        entry.giver ? displayName(entry.giver) : "",
        entry.reason,
      ].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [entries, query]);

  return (
    <>
      <div className="relative mb-4 max-w-sm">
        <Search className="text-muted-foreground/70 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search member, officer or reason"
          aria-label="Search reputation entries"
          className="pl-9"
        />
      </div>

      <div className="bg-card overflow-hidden rounded-xl border">
        {visible.length === 0 ? (
          <EmptyState
            icon={Star}
            title={query ? "No entries match" : "No reputation recorded yet"}
            description={
              query
                ? "Try a different member, officer or keyword."
                : "Entries appear here as officers grant or dock reputation."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="w-20 text-right">Rep</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="hidden md:table-cell">Given by</TableHead>
                <TableHead className="hidden text-right lg:table-cell">When</TableHead>
                <TableHead className="w-px" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <PersonCell person={entry.member} />
                  </TableCell>

                  <TableCell className="text-right">
                    <RepDelta points={entry.points} />
                  </TableCell>

                  <TableCell className="max-w-sm">
                    <p className="text-sm break-words">{entry.reason}</p>
                    <p className="text-muted-foreground mt-1 text-xs md:hidden">
                      by {displayName(entry.giver ?? {})} ·{" "}
                      {formatRelative(entry.created_at)}
                    </p>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <PersonCell person={entry.giver} compact />
                  </TableCell>

                  <TableCell className="text-muted-foreground hidden text-right text-xs whitespace-nowrap lg:table-cell">
                    <time
                      dateTime={entry.created_at}
                      title={formatDateTime(entry.created_at)}
                    >
                      {formatRelative(entry.created_at)}
                    </time>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                          <span className="sr-only">Entry actions</span>
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(entry)}>
                          <Pencil />
                          Edit entry
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setVoiding(entry)}
                        >
                          <Trash2 />
                          Void entry
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ReputationEditDialog
        entry={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={voiding !== null}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Void this reputation entry?"
        destructive
        confirmLabel="Void entry"
        description={
          voiding ? (
            <>
              {formatPoints(voiding.points)} rep for{" "}
              <span className="text-foreground font-medium">
                {displayName(voiding.member ?? {})}
              </span>{" "}
              will be removed from their score. A copy stays in the audit log.
            </>
          ) : null
        }
        onConfirm={async () => {
          if (!voiding) return;
          const result = await voidReputation(voiding.id);

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
