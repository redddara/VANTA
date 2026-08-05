"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { editRemit } from "@/lib/actions/remit";
import { displayName } from "@/lib/display";
import type { RemitLogWithPeople } from "@/lib/types/app";

function EditForm({
  entry,
  onDone,
}: {
  entry: RemitLogWithPeople;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(entry.amount));
  const [description, setDescription] = useState(entry.description ?? "");

  function save() {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }

    startTransition(async () => {
      const result = await editRemit({
        id: entry.id,
        amount: parsedAmount,
        description,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      onDone();
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit remit entry</DialogTitle>
        <DialogDescription>
          Credited to {displayName(entry.member ?? {})}. This edit is recorded in
          the audit log with the old and new values.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-1">
        <div className="grid gap-2">
          <Label htmlFor="remit-amount">Amount</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              id="remit-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="tabular pl-7"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="remit-description">Description</Label>
          <Textarea
            id="remit-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="No description"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}

export function RemitEditDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: RemitLogWithPeople | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed so switching rows remounts the form with fresh initial state. */}
        {entry && (
          <EditForm
            key={entry.id}
            entry={entry}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
