import { isAdmin, type InventoryWarehouse, type Profile } from "@/lib/types/app";

/** Hacking Practice is opt-in per member (Kingpin toggles it in Admin → Members). */
export function canAccessHackingPractice(
  profile: Pick<Profile, "hacking_practice_access"> | null | undefined,
): boolean {
  return Boolean(profile?.hacking_practice_access);
}

/**
 * Inventory nav/page gate. Admins always; others need at least one warehouse
 * assignment (enforced again by RLS).
 */
export function canAccessInventory(
  profile: Pick<Profile, "crew_rank"> | null | undefined,
  warehouses: readonly InventoryWarehouse[],
): boolean {
  if (!profile) return false;
  return isAdmin(profile.crew_rank) || warehouses.length > 0;
}
