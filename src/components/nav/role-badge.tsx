import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/lib/types/app";
import { cn } from "@/lib/utils";

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  return (
    <Badge
      variant={role === "member" ? "secondary" : "outline"}
      className={cn(
        "tracking-wide uppercase",
        role === "admin" && "border-primary/40 bg-primary/15 text-primary",
        role === "officer" && "border-foreground/25 text-foreground",
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
