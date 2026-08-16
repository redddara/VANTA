"use client";

import { Banknote, CheckCircle2, Clock, FileText, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { REIMBURSEMENT_STATUS_LABELS } from "@/lib/constants";
import type { ReimbursementStatus } from "@/lib/types/app";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  ReimbursementStatus,
  { variant: "secondary" | "warning" | "success" | "destructive" | "outline"; icon: typeof Clock }
> = {
  none: { variant: "outline", icon: FileText },
  pending: { variant: "warning", icon: Clock },
  reimbursed: { variant: "success", icon: CheckCircle2 },
  rejected: { variant: "destructive", icon: XCircle },
  recorded: { variant: "secondary", icon: Banknote },
};

export function ReimbursementStatusBadge({
  status,
  className,
}: {
  status: ReimbursementStatus;
  className?: string;
}) {
  const { variant, icon: Icon } = CONFIG[status];

  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <Icon aria-hidden className="size-3.5" />
      {REIMBURSEMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
