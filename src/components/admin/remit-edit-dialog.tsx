"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { QuantityInput } from "@/components/shared/quantity-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { editRemit } from "@/lib/actions/remit";
import { displayName } from "@/lib/display";
import type { RemitLogWithPeople, RemitType } from "@/lib/types/app";

function EditForm({
  entry,
  types,
  onDone,
}: {
  entry: RemitLogWithPeople;
  types: RemitType[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [remitTypeId, setRemitTypeId] = useState(entry.remit_type_id);
  const [quantity, setQuantity] = useState<number | undefined>(entry.quantity);
  const [amount, setAmount] = useState(
    entry.amount == null ? "" : String(entry.amount),
  );
  const [description, setDescription] = useState(entry.description ?? "");

  function save() {
    if (quantity == null || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }

    const parsedAmount = amount.trim() === "" ? null : Number(amount);
    if (parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      toast.error("Cash amount must be greater than zero, or left blank.");
      return;
    }

    startTransition(async () => {
      const result = await editRemit({
        id: entry.id,
        remitTypeId,
        quantity: quantity,
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
          <Label>Type</Label>
          <Select value={remitTypeId} onValueChange={setRemitTypeId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="remit-quantity">Quantity</Label>
          <QuantityInput
            id="remit-quantity"
            value={quantity}
            onChange={setQuantity}
            placeholder="e.g. 4"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="remit-amount">Cash amount (optional)</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              id="remit-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) =>
                setAmount(event.target.value.replace(/[^\d.]/g, ""))
              }
              className="tabular pl-7"
              placeholder="Blank if none"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="remit-description">Note</Label>
          <Textarea
            id="remit-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="No note"
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
  types,
  open,
  onOpenChange,
}: {
  entry: RemitLogWithPeople | null;
  types: RemitType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {entry && (
          <EditForm
            key={entry.id}
            entry={entry}
            types={types}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
