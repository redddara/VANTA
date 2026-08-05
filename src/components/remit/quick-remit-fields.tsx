"use client";

import { cn } from "@/lib/utils";
import type { RemitType } from "@/lib/types/app";

/** One-tap type picker — faster than a long select when logging many remits. */
export function RemitTypeChips({
  types,
  value,
  onChange,
  disabled,
}: {
  types: RemitType[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const quota = types.filter((t) => t.is_weekly_quota);
  const chopmats = types.filter((t) => t.name.startsWith("Chopmats"));
  const other = types.filter(
    (t) => !t.is_weekly_quota && !t.name.startsWith("Chopmats"),
  );

  const groups = [
    { label: "Weekly", items: quota },
    { label: "Chopmats", items: chopmats },
    { label: "Other", items: other },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((type) => {
              const short = type.name.startsWith("Chopmats — ")
                ? type.name.replace("Chopmats — ", "")
                : type.name;
              const selected = value === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(type.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/70 text-foreground hover:bg-secondary/70",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  {short}
                  {type.is_weekly_quota ? (
                    <span className="text-muted-foreground ml-1 text-xs">
                      ×{type.quota_amount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
