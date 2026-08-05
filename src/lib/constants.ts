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
  Enforcer: "Can log remit for others, view the remit tracker, set reputation, log inventory in/out, and manage strategies.",
  Captain: "Same as Enforcer: crew remit, tracker, reputation, inventory, and strategies.",
  Underboss: "Full control: ranks, remit approval, advance week moves, remit types, inventory items, strategies, reputation, and the audit log.",
  Kingpin: "Everything an Underboss can do, and the only rank that can appoint another Kingpin.",
};

/** How high a member sits on reputation — set by staff with the profile. */
export const REP_BANDS = ["low", "mid", "high"] as const;

export const REP_BAND_LABELS: Record<(typeof REP_BANDS)[number], string> = {
  low: "Low Rep",
  mid: "Mid Rep",
  high: "High Rep",
};

/**
 * Set Reputation dropdown catalogs. Labels can be Hacker, Driver, or both.
 */
export const REP_LABEL_OPTIONS = ["Hacker", "Driver"] as const;

export const REP_HOUSE_OPTIONS = [
  "Motel",
  "Normal House",
  "Mansion",
  "Consistent Mansion",
] as const;

export const REP_LAUNDER_OPTIONS = [
  "$75/MB",
  "$90/MB",
  "$105/MB",
  "$120/MB",
  "$135/MB",
] as const;

export const REP_STORE_OPTIONS = [
  "70MB",
  "75MB",
  "80MB",
  "85MB",
  "90MB",
] as const;

export const REMIT_STATUSES = ["pending", "approved", "rejected"] as const;

export const REMIT_STATUS_LABELS: Record<(typeof REMIT_STATUSES)[number], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const INVENTORY_DIRECTIONS = ["inbound", "outbound"] as const;

export const INVENTORY_DIRECTION_LABELS: Record<
  (typeof INVENTORY_DIRECTIONS)[number],
  string
> = {
  inbound: "Inbound",
  outbound: "Outbound",
};
