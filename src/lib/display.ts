/**
 * Pure presentation helpers, safe to import from Client Components.
 *
 * Deliberately separate from `@/lib/auth`, which pulls in `next/headers` and
 * would drag the whole server Supabase client into the browser bundle.
 */

/** Best available display name: in-game name, else Discord handle. */
export function displayName(profile: {
  ingame_name?: string | null;
  discord_username?: string | null;
}): string {
  return (
    profile.ingame_name?.trim() ||
    profile.discord_username?.trim() ||
    "Unknown member"
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
