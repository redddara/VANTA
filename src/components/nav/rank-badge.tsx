import { Badge } from "@/components/ui/badge";
import { isAdmin, isStaff, type Rank } from "@/lib/types/app";
import { cn } from "@/lib/utils";

/**
 * Rank is the permission, so the badge is styled by tier rather than by name:
 * whoever can approve remit looks different from whoever can only log it.
 */
export function RankBadge({
  rank,
  className,
}: {
  rank: Rank;
  className?: string;
}) {
  return (
    <Badge
      variant={isStaff(rank) ? "outline" : "secondary"}
      className={cn(
        "tracking-wide uppercase",
        isAdmin(rank) && "border-primary/40 bg-primary/15 text-primary",
        isStaff(rank) && !isAdmin(rank) && "border-foreground/25 text-foreground",
        className,
      )}
    >
      {rank}
    </Badge>
  );
}
