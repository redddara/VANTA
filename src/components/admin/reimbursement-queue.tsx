"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";

import { ReimbursementStatusBadge } from "@/components/reimbursement/reimbursement-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
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
import { reviewReimbursement } from "@/lib/actions/reimbursement";
import { REIMBURSEMENT_ENTRY_TYPE_LABELS } from "@/lib/constants";
import { displayName } from "@/lib/display";
import { formatDate, formatMoney } from "@/lib/format";
import type {
  ReimbursementLogWithPeople,
  ReimbursementStatus,
} from "@/lib/types/app";
import { Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "pending" | "reimbursed" | "rejected" | "all";

export function ReimbursementQueue({
  entries,
}: {
  entries: ReimbursementLogWithPeople[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const ownExpense = useMemo(
    () => entries.filter((e) => e.entry_type === "own_expense"),
    [entries],
  );

  const counts = {
    pending: ownExpense.filter((e) => e.status === "pending").length,
    reimbursed: ownExpense.filter((e) => e.status === "reimbursed").length,
    rejected: ownExpense.filter((e) => e.status === "rejected").length,
    all: ownExpense.length,
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ownExpense.filter((entry) => {
      if (filter !== "all" && entry.status !== filter) return false;
      if (!needle) return true;
      const hay = [
        displayName(entry.logger ?? {}),
        entry.purpose,
        entry.status,
        REIMBURSEMENT_ENTRY_TYPE_LABELS[entry.entry_type],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [ownExpense, filter, query]);

  async function review(
    id: string,
    status: "reimbursed" | "rejected" | "pending",
  ) {
    setBusyId(id);
    const result = await reviewReimbursement({ id, status });
    setBusyId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="bg-secondary/60 inline-flex h-9 flex-wrap items-center rounded-lg p-0.75">
          {(
            [
              ["pending", "Pending", counts.pending],
              ["reimbursed", "Reimbursed", counts.reimbursed],
              ["rejected", "Rejected", counts.rejected],
              ["all", "All", counts.all],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests"
            className="pl-9"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-card rounded-xl border">
          <EmptyState
            icon={Banknote}
            title={filter === "pending" ? "No pending requests" : "Nothing here"}
            description="Own-expense reimbursement requests show up for fund holders to confirm."
            className="py-10"
          />
        </div>
      ) : (
        <div className="bg-card overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Logged by</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(entry.entry_date)}
                  </TableCell>
                  <TableCell>
                    <PersonCell person={entry.logger} compact />
                  </TableCell>
                  <TableCell className="max-w-[18rem] text-sm">
                    {entry.purpose}
                  </TableCell>
                  <TableCell className="tabular text-right text-sm font-medium">
                    {formatMoney(entry.amount)}
                  </TableCell>
                  <TableCell>
                    <ReimbursementStatusBadge
                      status={entry.status as ReimbursementStatus}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {entry.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busyId === entry.id}
                            onClick={() => review(entry.id, "reimbursed")}
                          >
                            <Check />
                            Reimburse
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === entry.id}
                            onClick={() => review(entry.id, "rejected")}
                          >
                            <X />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === entry.id}
                          onClick={() => review(entry.id, "pending")}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
