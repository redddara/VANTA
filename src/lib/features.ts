import type { Profile } from "@/lib/types/app";

/** Hacking Practice is opt-in per member (Kingpin toggles it in Admin → Members). */
export function canAccessHackingPractice(
  profile: Pick<Profile, "hacking_practice_access"> | null | undefined,
): boolean {
  return Boolean(profile?.hacking_practice_access);
}
