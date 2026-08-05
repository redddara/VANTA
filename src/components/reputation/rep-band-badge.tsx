import { Badge } from "@/components/ui/badge";
import { REP_BAND_LABELS } from "@/lib/constants";
import type { RepBand } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function RepBandBadge({
  band,
  className,
}: {
  band: RepBand | null | undefined;
  className?: string;
}) {
  if (!band) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "tracking-wide uppercase",
        band === "low" && "border-muted-foreground/30 text-muted-foreground",
        band === "mid" && "border-foreground/30 text-foreground",
        band === "high" && "border-primary/40 bg-primary/15 text-primary",
        className,
      )}
    >
      {REP_BAND_LABELS[band]}
    </Badge>
  );
}
