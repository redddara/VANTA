"use client";

import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { voidInventoryMovement } from "@/lib/actions/inventory";
import { INVENTORY_DIRECTION_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import type { InventoryMovementWithPeople } from "@/lib/types/app";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function InventoryMovementsList({
  movements,
  canVoid,
  showWarehouse = false,
  warehouseNames = {},
}: {
  movements: InventoryMovementWithPeople[];
  canVoid: boolean;
  /** When true, show which warehouse each movement belongs to (Total view). */
  showWarehouse?: boolean;
  warehouseNames?: Record<number, string>;
}) {
  const router = useRouter();
  const [voiding, setVoiding] = useState<InventoryMovementWithPeople | null>(
    null,
  );

  async function handleVoid() {
    if (!voiding) return;
    const result = await voidInventoryMovement(voiding.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    setVoiding(null);
    router.refresh();
  }

  if (movements.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No movements yet"
        description="Inbound and outbound logs will show up here."
        className="py-10"
      />
    );
  }

  return (
    <>
      <ul className="divide-border/60 divide-y">
        {movements.map((entry) => {
          const inbound = entry.direction === "inbound";
          const Icon = inbound ? ArrowDownToLine : ArrowUpFromLine;
          const label = `${entry.quantity}× ${entry.item?.name ?? "Item"}`;

          return (
            <li key={entry.id} className="flex items-start gap-3 p-3">
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                  inbound
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-warning/30 bg-warning/10 text-warning",
                )}
              >
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{label}</p>
                  <Badge variant="outline" className="text-xs">
                    {INVENTORY_DIRECTION_LABELS[entry.direction]}
                  </Badge>
                  {showWarehouse ? (
                    <Badge variant="outline" className="text-muted-foreground text-xs">
                      {warehouseNames[entry.warehouse] ?? `W${entry.warehouse}`}
                    </Badge>
                  ) : null}
                  {entry.remit_log_id ? (
                    <Badge variant="outline" className="text-muted-foreground text-xs">
                      From remit
                    </Badge>
                  ) : null}
                </div>
                {entry.member ? (
                  <div className="mt-1">
                    <PersonCell person={entry.member} compact />
                  </div>
                ) : null}
                {entry.note ? (
                  <p className="text-muted-foreground mt-1 text-xs">{entry.note}</p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-xs">
                  {entry.logger ? (
                    <>
                      Logged by{" "}
                      <span className="text-foreground/80">
                        {entry.logger.ingame_name ||
                          entry.logger.discord_username ||
                          "staff"}
                      </span>
                      {" · "}
                    </>
                  ) : null}
                  {formatRelative(entry.created_at)}
                </p>
              </div>

              {canVoid && !entry.remit_log_id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive size-8 shrink-0"
                  onClick={() => setVoiding(entry)}
                  aria-label={`Void ${label}`}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={voiding != null}
        onOpenChange={(open) => {
          if (!open) setVoiding(null);
        }}
        title="Void this movement?"
        description={
          voiding
            ? `${voiding.quantity}× ${voiding.item?.name ?? "item"} (${INVENTORY_DIRECTION_LABELS[voiding.direction]}) will be removed. A copy stays in the audit log.`
            : ""
        }
        confirmLabel="Void movement"
        destructive
        onConfirm={handleVoid}
      />
    </>
  );
}
