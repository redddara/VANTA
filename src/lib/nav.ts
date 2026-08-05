import { rankWeight, type Rank } from "@/lib/types/app";

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
  { href: "/remit/mine", label: "Log Remit", minRank: "Prospect", group: "actions" },
  { href: "/remit/compliance", label: "Weekly Quota", minRank: "Enforcer", group: "actions" },
  { href: "/reputation/new", label: "Set Reputation", minRank: "Enforcer", group: "actions" },
  { href: "/admin/remit", label: "Remit Queue", minRank: "Underboss", group: "admin" },
  { href: "/admin/remit-types", label: "Remit Types", minRank: "Underboss", group: "admin" },
  { href: "/admin/members", label: "Members", minRank: "Underboss", group: "admin" },
  { href: "/admin/audit", label: "Audit Log", minRank: "Underboss", group: "admin" },
];

export const NAV_GROUP_LABELS: Record<NavItem["group"], string> = {
  main: "Portal",
  actions: "Actions",
  admin: "Admin",
};

export function visibleNavItems(rank: Rank): NavItem[] {
  const weight = rankWeight(rank);
  return NAV_ITEMS.filter((item) => weight >= rankWeight(item.minRank));
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
