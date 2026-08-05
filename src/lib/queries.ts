/**
 * PostgREST embed strings, kept in one place so a renamed foreign key breaks in
 * a single file instead of across every page.
 *
 * The `profiles!<constraint>` syntax is required because several of these
 * tables reference `profiles` more than once, and PostgREST cannot guess which
 * relationship an embed means.
 */
const PERSON = "id, ingame_name, discord_username, discord_avatar_url";

export const REMIT_SELECT = `
  id, member_id, amount, description, status, created_at, submitted_by, reviewed_by,
  member:profiles!remit_logs_member_id_fkey(${PERSON}),
  submitter:profiles!remit_logs_submitted_by_fkey(${PERSON}),
  reviewer:profiles!remit_logs_reviewed_by_fkey(${PERSON})
`;

export const REPUTATION_SELECT = `
  id, member_id, points, reason, created_at, given_by,
  member:profiles!reputation_entries_member_id_fkey(${PERSON}),
  giver:profiles!reputation_entries_given_by_fkey(${PERSON})
`;

export const AUDIT_SELECT = `
  id, actor_id, action, target_table, target_id, detail, created_at,
  actor:profiles!audit_log_actor_id_fkey(${PERSON})
`;

export const MEMBER_SUMMARY_SELECT = `
  id, discord_username, discord_avatar_url, ingame_name, crew_rank, role,
  is_active, created_at, total_rep, total_approved_remit, pending_remit_count
`;
