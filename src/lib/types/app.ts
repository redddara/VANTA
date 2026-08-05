import type { Tables } from "@/lib/types/database.types";

/**
 * The database stores role and status as text with CHECK constraints, so the
 * generated types widen them to `string`. These narrow them back for the app.
 */
export type Role = "member" | "officer" | "admin";
export type RemitStatus = "pending" | "approved" | "rejected";

export type Profile = Omit<Tables<"profiles">, "role"> & { role: Role };

export type RemitLog = Omit<Tables<"remit_logs">, "status"> & {
  status: RemitStatus;
};

export type ReputationEntry = Tables<"reputation_entries">;

export type AuditLogEntry = Tables<"audit_log">;

/** A member_summary row, with the view's nullable columns resolved. */
export type MemberSummary = {
  id: string;
  discord_username: string | null;
  discord_avatar_url: string | null;
  ingame_name: string | null;
  crew_rank: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  total_rep: number;
  total_approved_remit: number;
  pending_remit_count: number;
};

/** A profile reference joined onto a log row, for "who did this" columns. */
export type ProfileRef = {
  id: string;
  ingame_name: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
};

export type RemitLogWithPeople = RemitLog & {
  member: ProfileRef | null;
  submitter: ProfileRef | null;
  reviewer: ProfileRef | null;
};

export type ReputationEntryWithPeople = ReputationEntry & {
  member: ProfileRef | null;
  giver: ProfileRef | null;
};

export type AuditLogEntryWithActor = AuditLogEntry & {
  actor: ProfileRef | null;
};

export function isRole(value: unknown): value is Role {
  return value === "member" || value === "officer" || value === "admin";
}

export function isRemitStatus(value: unknown): value is RemitStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

/** Officers and admins. Mirrors the SQL helper `vanta_is_staff()`. */
export function isStaff(role: Role): boolean {
  return role === "officer" || role === "admin";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}
