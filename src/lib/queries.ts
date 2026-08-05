/**
 * PostgREST embed strings, kept in one place so a renamed foreign key breaks in
 * a single file instead of across every page.
 *
 * The `profiles!<constraint>` syntax is required because several of these
 * tables reference `profiles` more than once, and PostgREST cannot guess which
 * relationship an embed means.
 */
const PERSON = "id, ingame_name, discord_username, discord_avatar_url";

export const REMIT_TYPE_SELECT = `
  id, name, is_weekly_quota, quota_amount, created_at
`;

export const REMIT_SELECT = `
  id, member_id, remit_type_id, quantity, amount, description, status,
  created_at, submitted_by, reviewed_by, week_start,
  remit_type:remit_types!remit_logs_remit_type_id_fkey(id, name, is_weekly_quota),
  member:profiles!remit_logs_member_id_fkey(${PERSON}),
  submitter:profiles!remit_logs_submitted_by_fkey(${PERSON}),
  reviewer:profiles!remit_logs_reviewed_by_fkey(${PERSON})
`;

export const AUDIT_SELECT = `
  id, actor_id, action, target_table, target_id, detail, created_at,
  actor:profiles!audit_log_actor_id_fkey(${PERSON})
`;

export const REP_TIER_SELECT = `
  id, level_order, tier_label, house_rob_payout, atm_payout, launder_rate,
  store_capacity, gps_unlocked, rope_unlocked, nos_unlocked, usb_unlocked, created_at
`;

export const MEMBER_SUMMARY_SELECT = `
  id, discord_username, discord_avatar_url, ingame_name, crew_rank,
  is_active, created_at, current_tier_id, tier_level_order, tier_label,
  house_rob_payout, atm_payout, launder_rate, store_capacity,
  gps_unlocked, rope_unlocked, nos_unlocked, usb_unlocked,
  total_approved_remit, pending_remit_count
`;

export const WEEKLY_COMPLIANCE_SELECT = `
  member_id, discord_username, discord_avatar_url, ingame_name, crew_rank,
  is_active, week_start, quota_type_id, quota_type_name, quota_amount,
  approved_quantity, quota_met
`;
