import { Check, X } from "lucide-react";

import {
  CRAFTING_UNLOCK_COLUMNS,
  CRAFTING_UNLOCK_LABELS,
  CRAFTING_UNLOCKS,
  type CraftingUnlock,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

type UnlockSource = {
  gps_unlocked?: boolean | null;
  rope_unlocked?: boolean | null;
  nos_unlocked?: boolean | null;
  usb_unlocked?: boolean | null;
};

export function CraftingUnlockBadges({
  tier,
  className,
}: {
  tier: UnlockSource | null | undefined;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {CRAFTING_UNLOCKS.map((key) => {
        const unlocked = Boolean(tier?.[CRAFTING_UNLOCK_COLUMNS[key]]);
        return (
          <li key={key}>
            <UnlockBadge unlock={key} unlocked={unlocked} />
          </li>
        );
      })}
    </ul>
  );
}

export function UnlockBadge({
  unlock,
  unlocked,
}: {
  unlock: CraftingUnlock;
  unlocked: boolean;
}) {
  const Icon = unlocked ? Check : X;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        unlocked
          ? "border-success/30 bg-success/10 text-success"
          : "border-border/70 text-muted-foreground/70 bg-secondary/40",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {CRAFTING_UNLOCK_LABELS[unlock]}
      <span className="sr-only">{unlocked ? "unlocked" : "locked"}</span>
    </span>
  );
}
