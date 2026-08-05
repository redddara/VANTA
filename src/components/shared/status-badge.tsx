import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { REMIT_STATUS_LABELS } from "@/lib/constants";
import type { RemitStatus } from "@/lib/types/app";

const CONFIG = {
  pending: { variant: "warning", icon: Clock },
  approved: { variant: "success", icon: CheckCircle2 },
  rejected: { variant: "destructive", icon: XCircle },
} as const;

export function StatusBadge({ status }: { status: RemitStatus }) {
  const { variant, icon: Icon } = CONFIG[status];

  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon aria-hidden />
      {REMIT_STATUS_LABELS[status]}
    </Badge>
  );
}
