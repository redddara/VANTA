import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayName, initials } from "@/lib/display";
import { cn } from "@/lib/utils";

export function MemberAvatar({
  profile,
  className,
}: {
  profile: {
    ingame_name?: string | null;
    discord_username?: string | null;
    discord_avatar_url?: string | null;
  } | null;
  className?: string;
}) {
  const name = profile ? displayName(profile) : "Unknown";

  return (
    <Avatar className={cn("border-border/80 border", className)}>
      {profile?.discord_avatar_url && (
        <AvatarImage src={profile.discord_avatar_url} alt="" />
      )}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
