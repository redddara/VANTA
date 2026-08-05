import { Layers } from "lucide-react";

import { CraftingUnlockBadges } from "@/components/reputation/crafting-unlocks";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RepTier } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function RepLadderTable({
  tiers,
  highlightTierId,
}: {
  tiers: RepTier[];
  highlightTierId?: string | null;
}) {
  if (tiers.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No tiers yet"
        description="An admin still needs to set up the reputation ladder."
      />
    );
  }

  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>House Rob</TableHead>
            <TableHead>ATM</TableHead>
            <TableHead>Launder</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Crafting</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => {
            const active = highlightTierId != null && tier.id === highlightTierId;
            return (
              <TableRow
                key={tier.id}
                className={cn(active && "bg-primary/5")}
                data-active={active || undefined}
              >
                <TableCell className="tabular text-muted-foreground font-medium">
                  {tier.level_order}
                </TableCell>
                <TableCell className="font-medium">
                  {tier.tier_label}
                  {active ? (
                    <span className="text-primary ml-2 text-xs font-normal">
                      your tier
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="tabular text-sm">
                  {tier.house_rob_payout || "\u2014"}
                </TableCell>
                <TableCell className="tabular text-sm">
                  {tier.atm_payout || "\u2014"}
                </TableCell>
                <TableCell className="tabular text-sm">
                  {tier.launder_rate || "\u2014"}
                </TableCell>
                <TableCell className="tabular text-sm">
                  {tier.store_capacity || "\u2014"}
                </TableCell>
                <TableCell>
                  <CraftingUnlockBadges tier={tier} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
