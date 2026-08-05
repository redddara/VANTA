import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Turns a Postgres/PostgREST failure into something a crew member can act on.
 *
 * Permission failures are expected here rather than exceptional: the UI hides
 * actions a rank cannot perform, so anything that reaches this path is either a
 * stale page or someone poking at the API directly.
 */
export function toActionError(error: PostgrestError): string {
  // Raised by our own guard triggers with an explicit message worth surfacing.
  if (error.code === "P0001" || error.message.startsWith("Vanta ")) {
    return error.message;
  }

  switch (error.code) {
    case "42501":
      return "Your rank does not allow that. Try refreshing the page.";
    case "23505":
      return "That record already exists.";
    case "23503":
      return "That member no longer exists.";
    case "23514":
      return "Those values are not valid for this record.";
    default:
      break;
  }

  if (error.message.toLowerCase().includes("row-level security")) {
    return "Your rank does not allow that. Try refreshing the page.";
  }

  return error.message || "Something went wrong. Please try again.";
}

/** The first validation problem, phrased for the member who hit it. */
export function firstIssue(error: ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
