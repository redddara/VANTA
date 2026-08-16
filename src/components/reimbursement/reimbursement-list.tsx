"use client";

import { useRouter } from "next/navigation";
import { Banknote, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ReimbursementStatusBadge } from "@/components/reimbursement/reimbursement-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteReimbursement } from "@/lib/actions/reimbursement";
import { REIMBURSEMENT_ENTRY_TYPE_LABELS } from "@/lib/constants";
import { formatMoney, formatDate } from "@/lib/format";
import type {
  ReimbursementLogWithPeople,
  ReimbursementStatus,
} from "@/lib/types/app";

export function ReimbursementList({
  entries,
  currentUserId,
  showLogger = true,
}: {
  entries: ReimbursementLogWithPeople[];
  currentUserId: string;
  showLogger?: boolean;
}) {
  const router = useRouter();

  async function onDelete(id: string) {
    const result = await deleteReimbursement(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Banknote}
        title="No logs yet"
        description="Own-expense and org withdrawal entries show up here."
        className="py-10"
      />
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {showLogger ? <TableHead>Logged by</TableHead> : null}
            <TableHead>Type</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const canDelete =
              entry.logged_by === currentUserId &&
              entry.entry_type === "own_expense" &&
              (entry.status === "none" || entry.status === "pending");

            return (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDate(entry.entry_date)}
                </TableCell>
                {showLogger ? (
                  <TableCell>
                    <PersonCell person={entry.logger} compact />
                  </TableCell>
                ) : null}
                <TableCell className="text-sm">
                  {REIMBURSEMENT_ENTRY_TYPE_LABELS[entry.entry_type]}
                </TableCell>
                <TableCell className="max-w-[16rem] truncate text-sm">
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
                <TableCell>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete log"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
