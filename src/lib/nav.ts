import type { Role } from "@/lib/types/app";

export type NavItem = {
  href: string;
  label: string;
  /** Lowest role that may see this link. RLS enforces the real boundary. */
  minRole: Role;
  group: "main" | "actions" | "admin";
};

const ROLE_RANK: Record<Role, number> = { member: 0, officer: 1, admin: 2 };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", minRole: "member", group: "main" },
  { href: "/roster", label: "Roster", minRole: "member", group: "main" },
  { href: "/remit/new", label: "Submit Remit", minRole: "officer", group: "actions" },
  { href: "/reputation/new", label: "Give Rep", minRole: "officer", group: "actions" },
  { href: "/admin/remit", label: "Remit Queue", minRole: "admin", group: "admin" },
  { href: "/admin/reputation", label: "Rep Ledger", minRole: "admin", group: "admin" },
  { href: "/admin/members", label: "Members", minRole: "admin", group: "admin" },
  { href: "/admin/audit", label: "Audit Log", minRole: "admin", group: "admin" },
];

export function visibleNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => ROLE_RANK[role] >= ROLE_RANK[item.minRole]);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
