import { RANKS, REMIT_STATUSES } from "@/lib/constants";
import type { Tables } from "@/lib/types/database.types";

/**
 * The database stores rank and status as text with CHECK constraints, so the
 * generated types widen them to `string`. These narrow them back for the app.
 */
export type Rank = (typeof RANKS)[number];
export type RemitStatus = (typeof REMIT_STATUSES)[number];

export type Profile = Omit<Tables<"profiles">, "crew_rank"> & { crew_rank: Rank };

export type RemitType = Tables<"remit_types">;

export type RemitLog = Omit<Tables<"remit_logs">, "status"> & {
  status: RemitStatus;
};

export type RemitLogWithType = RemitLog & {
  remit_type: Pick<RemitType, "id" | "name" | "is_weekly_quota"> | null;
};

export type RepTier = Tables<"rep_tiers">;
export type MemberRep = Tables<"member_rep">;

export type WeeklyCompliance = {
  member_id: string;
  discord_username: string | null;
  discord_avatar_url: string | null;
  ingame_name: string | null;
  crew_rank: Rank;
  is_active: boolean;
  week_start: string;
  quota_type_id: string;
  quota_type_name: string;
  quota_amount: number;
  approved_quantity: number;
  quota_met: boolean;
};

export type AuditLogEntry = Tables<"audit_log">;

/** Crafting unlocks that ride on a tier. Order matches the ladder table. */
export const CRAFTING_UNLOCKS = ["gps", "rope", "nos", "usb"] as const;
export type CraftingUnlock = (typeof CRAFTING_UNLOCKS)[number];

export const CRAFTING_UNLOCK_LABELS: Record<CraftingUnlock, string> = {
  gps: "GPS",
  rope: "Rope",
  nos: "NOS",
  usb: "USB",
};

export const CRAFTING_UNLOCK_COLUMNS: Record<
  CraftingUnlock,
  "gps_unlocked" | "rope_unlocked" | "nos_unlocked" | "usb_unlocked"
> = {
  gps: "gps_unlocked",
  rope: "rope_unlocked",
  nos: "nos_unlocked",
  usb: "usb_unlocked",
};

/** A member_summary row, with the view's nullable columns resolved. */
export type MemberSummary = {
  id: string;
  discord_username: string | null;
  discord_avatar_url: string | null;
  ingame_name: string | null;
  crew_rank: Rank;
  is_active: boolean;
  created_at: string;
  current_tier_id: string | null;
  tier_level_order: number | null;
  tier_label: string | null;
  house_rob_payout: string | null;
  atm_payout: string | null;
  launder_rate: string | null;
  store_capacity: string | null;
  gps_unlocked: boolean | null;
  rope_unlocked: boolean | null;
  nos_unlocked: boolean | null;
  usb_unlocked: boolean | null;
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

export type RemitLogWithPeople = RemitLogWithType & {
  member: ProfileRef | null;
  submitter: ProfileRef | null;
  reviewer: ProfileRef | null;
};

export type AuditLogEntryWithActor = AuditLogEntry & {
  actor: ProfileRef | null;
};

export function isRank(value: unknown): value is Rank {
  return RANKS.includes(value as Rank);
}

export function isRemitStatus(value: unknown): value is RemitStatus {
  return REMIT_STATUSES.includes(value as RemitStatus);
}

/**
 * Position on the ladder, Prospect 0 through Kingpin 5. Unknown ranks weigh -1
 * so they are treated as less trusted than a Prospect rather than more.
 *
 * Mirrors the SQL function `vanta_rank_weight()`. The predicates below use it at
 * the same thresholds the policies do, so the UI hides exactly what the database
 * would have refused.
 */
export function rankWeight(rank: string | null): number {
  return isRank(rank) ? RANKS.indexOf(rank) : -1;
}

/** Underboss and Kingpin. Mirrors `vanta_is_admin()`. */
export function isAdmin(rank: string | null): boolean {
  return rankWeight(rank) >= 4;
}

/** Enforcer and up: may submit remit for others and set reputation tiers. */
export function isStaff(rank: string | null): boolean {
  return rankWeight(rank) >= 2;
}

/** Operator and up. A Prospect cannot see who else is in the crew. */
export function canViewRoster(rank: string | null): boolean {
  return rankWeight(rank) >= 1;
}
