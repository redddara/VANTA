"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { voidRemit } from "@/lib/actions/remit";
import type { RemitStatus } from "@/lib/types/app";

export function RemitDeleteButton({
  id,
  status,
  label,
}: {
  id: string;
  status: RemitStatus | string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (status !== "pending") return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive size-8 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Delete this pending remit"
      >
        <Trash2 />
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this remit?"
        description={
          label
            ? `Remove “${label}” while it is still pending. You can log it again if you meant something else.`
            : "Remove this pending remit. You can log it again if you meant something else."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const result = await voidRemit(id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message);
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
