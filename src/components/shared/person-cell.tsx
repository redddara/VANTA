import { MemberAvatar } from "@/components/nav/member-avatar";
import { displayName } from "@/lib/display";
import type { ProfileRef } from "@/lib/types/app";
import { cn } from "@/lib/utils";

/** Avatar plus name, used wherever a table needs a "who" column. */
export function PersonCell({
  person,
  subtitle,
  className,
  compact = false,
}: {
  person: ProfileRef | null;
  subtitle?: string | null;
  className?: string;
  compact?: boolean;
}) {
  if (!person) {
    return <span className="text-muted-foreground text-sm">System</span>;
  }

  const name = displayName(person);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <MemberAvatar
        profile={person}
        className={compact ? "size-6" : "size-8"}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        {subtitle && (
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
