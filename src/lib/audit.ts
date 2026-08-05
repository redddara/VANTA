import type { Json } from "@/lib/types/database.types";

export type AuditTone = "neutral" | "positive" | "negative" | "warning";

type AuditMeta = { label: string; tone: AuditTone };

const ACTIONS: Record<string, AuditMeta> = {
  // Retired when role and rank merged, kept so older entries still read cleanly.
  "role.change": { label: "Role changed", tone: "warning" },
  // Rank is the permission now, so a rank change is a privilege change.
  "rank.change": { label: "Rank changed", tone: "warning" },
  "member.deactivate": { label: "Member deactivated", tone: "negative" },
  "member.reactivate": { label: "Member reactivated", tone: "positive" },
  "remit.status": { label: "Remit reviewed", tone: "neutral" },
  "remit.approve": { label: "Remit approved", tone: "positive" },
  "remit.reject": { label: "Remit rejected", tone: "negative" },
  "remit.edit": { label: "Remit edited", tone: "warning" },
  "remit.delete": { label: "Remit voided", tone: "negative" },
  "inventory.inbound": { label: "Inventory inbound", tone: "positive" },
  "inventory.outbound": { label: "Inventory outbound", tone: "warning" },
  "inventory.void": { label: "Inventory voided", tone: "negative" },
  "inventory.item_create": { label: "Inventory item added", tone: "positive" },
  "inventory.item_edit": { label: "Inventory item edited", tone: "warning" },
  "inventory.item_delete": { label: "Inventory item deleted", tone: "negative" },
  // Retired with the points ledger; kept so older audit rows still read cleanly.
  "reputation.edit": { label: "Reputation edited", tone: "warning" },
  "reputation.delete": { label: "Reputation voided", tone: "negative" },
  // Retired with the shared ladder; kept so older audit rows still read cleanly.
  "rep.tier_change": { label: "Rep tier changed", tone: "warning" },
  "rep.set": { label: "Reputation set", tone: "warning" },
};

/** Known action keys for filter dropdowns (newest crew actions first). */
export const AUDIT_ACTION_FILTERS = [
  "rank.change",
  "member.deactivate",
  "member.reactivate",
  "remit.approve",
  "remit.reject",
  "remit.edit",
  "remit.delete",
  "remit.status",
  "inventory.inbound",
  "inventory.outbound",
  "inventory.void",
  "inventory.item_create",
  "inventory.item_edit",
  "inventory.item_delete",
  "rep.set",
  "rep.tier_change",
  "reputation.edit",
  "reputation.delete",
  "role.change",
] as const;

export const AUDIT_PAGE_SIZE = 50;

export function describeAction(action: string): AuditMeta {
  return ACTIONS[action] ?? { label: action, tone: "neutral" };
}

export type FieldChange = { field: string; from: string; to: string };

const HIDDEN_FIELDS = new Set([
  "member",
  "member_id",
  "deleted",
  "quantity",
  "amount",
  "remit_type",
  "reviewed_by",
  "discord_username",
  "item",
  "direction",
  "note",
  "name",
]);

const FIELD_LABELS: Record<string, string> = {
  amount: "Amount",
  crew_rank: "Rank",
  description: "Description",
  is_active: "Active",
  points: "Points",
  reason: "Reason",
  reviewed_by: "Reviewed by",
  role: "Role",
  status: "Status",
  tier: "Tier",
  quantity: "Quantity",
  remit_type_id: "Remit type",
  remit_type: "Remit type",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

function stringify(value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Pulls the {from, to} pairs the audit triggers write, skipping the metadata
 * keys they attach alongside them.
 */
export function extractChanges(detail: Json | null): FieldChange[] {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return [];

  const changes: FieldChange[] = [];

  for (const [field, value] of Object.entries(detail)) {
    if (HIDDEN_FIELDS.has(field)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    if (!("from" in value) && !("to" in value)) continue;

    changes.push({
      field,
      from: stringify(value.from as Json),
      to: stringify(value.to as Json),
    });
  }

  return changes;
}

/** The snapshot a delete trigger stores, if this entry is a deletion. */
export function extractDeleted(
  detail: Json | null,
): Record<string, Json> | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;

  const deleted = detail.deleted;
  if (!deleted || typeof deleted !== "object" || Array.isArray(deleted)) return null;

  return deleted as Record<string, Json>;
}

/** Snapshot fields attached to remit approve/reject audits. */
export function extractRemitReviewSummary(detail: Json | null): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;

  const type =
    typeof detail.remit_type === "string" ? detail.remit_type : null;
  const quantity =
    typeof detail.quantity === "number" || typeof detail.quantity === "string"
      ? detail.quantity
      : null;
  const amount =
    detail.amount === null || detail.amount === undefined
      ? null
      : typeof detail.amount === "number" || typeof detail.amount === "string"
        ? detail.amount
        : null;

  if (type == null && quantity == null && amount == null) return null;

  const parts: string[] = [];
  if (quantity != null && type) parts.push(`${quantity}× ${type}`);
  else if (type) parts.push(type);
  else if (quantity != null) parts.push(`qty ${quantity}`);
  if (amount != null && amount !== "") parts.push(`$${amount}`);
  return parts.join(" · ");
}

/** Snapshot for inventory inbound/outbound audits. */
export function extractInventorySummary(detail: Json | null): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;

  const item =
    typeof detail.item === "string"
      ? detail.item
      : typeof detail.name === "string"
        ? detail.name
        : null;
  const quantity =
    typeof detail.quantity === "number" || typeof detail.quantity === "string"
      ? detail.quantity
      : null;
  const direction =
    typeof detail.direction === "string" ? detail.direction : null;
  const note = typeof detail.note === "string" ? detail.note : null;

  if (item == null && quantity == null) return null;

  const parts: string[] = [];
  if (quantity != null && item) parts.push(`${quantity}× ${item}`);
  else if (item) parts.push(item);
  else if (quantity != null) parts.push(`qty ${quantity}`);
  if (direction === "inbound" || direction === "outbound") {
    parts.push(direction);
  }
  if (note) parts.push(note);
  return parts.join(" · ");
}

/** The affected member's name, when the trigger recorded one. */
export function extractSubject(detail: Json | null): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const member = detail.member;
  return typeof member === "string" && member.length > 0 ? member : null;
}
