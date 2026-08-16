import { canAccessHackingPractice, canAccessInventory } from "@/lib/features";
import { rankWeight, type InventoryWarehouse, type Profile, type Rank } from "@/lib/types/app";

export type NavItem = {
  href: string;
  label: string;
  /** Lowest rank that may see this link. RLS enforces the real boundary. */
  minRank: Rank;
  group: "main" | "actions" | "admin";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", minRank: "Prospect", group: "main" },
  { href: "/roster", label: "Roster", minRank: "Operator", group: "main" },
  { href: "/strategies", label: "Strategies", minRank: "Prospect", group: "main" },
  { href: "/hacking", label: "Hacking Practice", minRank: "Operator", group: "main" },
  { href: "/remit/mine", label: "Log Remit", minRank: "Prospect", group: "actions" },
  { href: "/reimbursement", label: "Reimbursement Logs", minRank: "Prospect", group: "actions" },
  { href: "/remit/tracker", label: "Remit Tracker", minRank: "Enforcer", group: "actions" },
  // Visibility is assignment/admin gated in visibleNavItems (not rank alone).
  { href: "/inventory", label: "Inventory", minRank: "Prospect", group: "actions" },
  { href: "/reputation/new", label: "Set Reputation", minRank: "Enforcer", group: "actions" },
  { href: "/admin/remit", label: "Remit Queue", minRank: "Underboss", group: "admin" },
  { href: "/admin/reimbursement", label: "Reimbursement Queue", minRank: "Underboss", group: "admin" },
  { href: "/admin/remit-types", label: "Remit Types", minRank: "Underboss", group: "admin" },
  { href: "/admin/announcements", label: "Updates", minRank: "Underboss", group: "admin" },
  { href: "/admin/members", label: "Members", minRank: "Underboss", group: "admin" },
  { href: "/admin/audit", label: "Audit Log", minRank: "Underboss", group: "admin" },
];

export const NAV_GROUP_LABELS: Record<NavItem["group"], string> = {
  main: "Portal",
  actions: "Actions",
  admin: "Admin",
};

export function visibleNavItems(
  profile: Pick<Profile, "crew_rank" | "hacking_practice_access">,
  warehouses: readonly InventoryWarehouse[] = [],
): NavItem[] {
  const weight = rankWeight(profile.crew_rank);
  return NAV_ITEMS.filter((item) => {
    if (item.href === "/hacking") return canAccessHackingPractice(profile);
    if (item.href === "/inventory") {
      return canAccessInventory(profile, warehouses);
    }
    return weight >= rankWeight(item.minRank);
  });
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
