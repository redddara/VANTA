import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "accent";
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-5", className)}>
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {label}
          </p>
          <p
            className={cn(
              "tabular mt-2 text-2xl leading-none font-semibold sm:text-3xl",
              tone === "positive" && "text-success",
              tone === "negative" && "text-destructive",
              tone === "accent" && "text-primary",
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="text-muted-foreground mt-2 text-xs">{hint}</p>
          )}
        </div>

        {Icon && (
          <div className="bg-secondary/70 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>
        )}
      </div>
    </Card>
  );
}
