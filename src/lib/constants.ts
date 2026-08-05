import type { RemitStatus, Role } from "@/lib/types/app";

/**
 * In-character crew titles. Purely cosmetic: permissions come from `role`, so
 * adding a rank here never widens anyone's access. Order is lowest to highest
 * and drives the roster's rank sort.
 */
export const CREW_RANKS = [
  "Recruit",
  "Soldier",
  "Enforcer",
  "Capo",
  "Underboss",
  "Boss",
] as const;

export const ROLES: Role[] = ["member", "officer", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  officer: "Officer",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  member: "Can see the roster and their own remit and reputation history.",
  officer: "Can also submit remit and grant or dock reputation.",
  admin: "Full control: roles, ranks, remit approval and the audit log.",
};

export const REMIT_STATUSES: RemitStatus[] = ["pending", "approved", "rejected"];

export const REMIT_STATUS_LABELS: Record<RemitStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
