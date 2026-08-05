import type { Json } from "@/lib/types/database.types";

export type AuditTone = "neutral" | "positive" | "negative" | "warning";

type AuditMeta = { label: string; tone: AuditTone };

const ACTIONS: Record<string, AuditMeta> = {
  "role.change": { label: "Role changed", tone: "warning" },
  "rank.change": { label: "Rank changed", tone: "neutral" },
  "member.deactivate": { label: "Member deactivated", tone: "negative" },
  "member.reactivate": { label: "Member reactivated", tone: "positive" },
  "remit.status": { label: "Remit reviewed", tone: "neutral" },
  "remit.edit": { label: "Remit edited", tone: "warning" },
  "remit.delete": { label: "Remit voided", tone: "negative" },
  "reputation.edit": { label: "Reputation edited", tone: "warning" },
  "reputation.delete": { label: "Reputation voided", tone: "negative" },
};

export function describeAction(action: string): AuditMeta {
  return ACTIONS[action] ?? { label: action, tone: "neutral" };
}

export type FieldChange = { field: string; from: string; to: string };

const HIDDEN_FIELDS = new Set(["member", "member_id", "deleted"]);

const FIELD_LABELS: Record<string, string> = {
  amount: "Amount",
  crew_rank: "Crew rank",
  description: "Description",
  is_active: "Active",
  points: "Points",
  reason: "Reason",
  reviewed_by: "Reviewed by",
  role: "Role",
  status: "Status",
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

/** The affected member's name, when the trigger recorded one. */
export function extractSubject(detail: Json | null): string | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
  const member = detail.member;
  return typeof member === "string" && member.length > 0 ? member : null;
}
