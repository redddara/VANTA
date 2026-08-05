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
import { editReputation } from "@/lib/actions/reputation";
import { displayName } from "@/lib/display";
import type { ReputationEntryWithPeople } from "@/lib/types/app";

function EditForm({
  entry,
  onDone,
}: {
  entry: ReputationEntryWithPeople;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [points, setPoints] = useState(String(entry.points));
  const [reason, setReason] = useState(entry.reason);

  function save() {
    const parsedPoints = Number(points);
    if (!Number.isInteger(parsedPoints) || parsedPoints === 0) {
      toast.error("Points must be a whole number and cannot be zero.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("A reason of at least 3 characters is required.");
      return;
    }

    startTransition(async () => {
      const result = await editReputation({
        id: entry.id,
        points: parsedPoints,
        reason,
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
        <DialogTitle>Edit reputation entry</DialogTitle>
        <DialogDescription>
          Applied to {displayName(entry.member ?? {})}, originally given by{" "}
          {displayName(entry.giver ?? {})}. The change is recorded in the audit
          log.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-1">
        <div className="grid gap-2">
          <Label htmlFor="rep-points">Points</Label>
          <Input
            id="rep-points"
            type="number"
            inputMode="numeric"
            step="1"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            className="tabular"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="rep-reason">Reason</Label>
          <Textarea
            id="rep-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
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

export function ReputationEditDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: ReputationEntryWithPeople | null;
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
