/**
 * The vocabulary the portal is built on. Types are derived from these tuples in
 * `@/lib/types/app`, so this file imports nothing and everything else lines up
 * with it.
 */

/**
 * The crew ladder, lowest to highest.
 *
 * Rank is the only thing that grants access: the same value drives the SQL
 * helper `vanta_rank_weight()`, so adding or reordering a rank here without the
 * matching migration will quietly disagree with the database. The order also
 * drives the roster's rank sort.
 */
export const RANKS = [
  "Prospect",
  "Operator",
  "Enforcer",
  "Captain",
  "Underboss",
  "Kingpin",
] as const;

type Rank = (typeof RANKS)[number];

export const RANK_DESCRIPTIONS: Record<Rank, string> = {
  Prospect: "Can log remit and see their weekly quota progress and reputation.",
  Operator: "Can see the roster, remit history, and each member's reputation.",
  Enforcer: "Can log remit for others, view weekly quota compliance, and set reputation one member at a time.",
  Captain: "Same as Enforcer: crew remit, weekly quota, and per-member reputation.",
  Underboss: "Full control: ranks, remit approval, remit types, reputation, and the audit log.",
  Kingpin: "Everything an Underboss can do, and the only rank that can appoint another Kingpin.",
};

/** How high a member sits on reputation — set by staff with the profile. */
export const REP_BANDS = ["low", "mid", "high"] as const;

export const REP_BAND_LABELS: Record<(typeof REP_BANDS)[number], string> = {
  low: "Low Rep",
  mid: "Mid Rep",
  high: "High Rep",
};

export const REMIT_STATUSES = ["pending", "approved", "rejected"] as const;

export const REMIT_STATUS_LABELS: Record<(typeof REMIT_STATUSES)[number], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
