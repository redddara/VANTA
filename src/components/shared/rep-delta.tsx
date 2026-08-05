import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A signed reputation change, coloured by direction. */
export function RepDelta({
  points,
  className,
}: {
  points: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular font-semibold",
        points > 0 && "text-[var(--success)]",
        points < 0 && "text-destructive",
        points === 0 && "text-muted-foreground",
        className,
      )}
    >
      {formatPoints(points)}
    </span>
  );
}
