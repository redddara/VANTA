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
  id, name, is_weekly_quota, quota_amount, inventory_item_id, created_at
`;

export const REMIT_SELECT = `
  id, member_id, remit_type_id, quantity, amount, description, proof_path, status,
  created_at, submitted_by, reviewed_by, week_start, target_week_start, is_advance,
  remit_type:remit_types!remit_logs_remit_type_id_fkey(id, name, is_weekly_quota),
  member:profiles!remit_logs_member_id_fkey(${PERSON}),
  submitter:profiles!remit_logs_submitted_by_fkey(${PERSON}),
  reviewer:profiles!remit_logs_reviewed_by_fkey(${PERSON})
`;

export const AUDIT_SELECT = `
  id, actor_id, action, target_table, target_id, detail, created_at,
  actor:profiles!audit_log_actor_id_fkey(${PERSON})
`;

export const MEMBER_SUMMARY_SELECT = `
  id, discord_username, discord_avatar_url, ingame_name, crew_rank,
  is_active, created_at, rep_band, tier_label,
  house_rob_payout, atm_payout, launder_rate, store_capacity,
  gps_unlocked, rope_unlocked, nos_unlocked, usb_unlocked,
  total_approved_remit, pending_remit_count
`;

export const WEEKLY_COMPLIANCE_SELECT = `
  member_id, discord_username, discord_avatar_url, ingame_name, crew_rank,
  is_active, week_start, quota_type_id, quota_type_name, quota_amount,
  approved_quantity, quota_met
`;

export const INVENTORY_ITEM_SELECT = `
  id, name, is_active, created_at
`;

export const INVENTORY_STOCK_SELECT = `
  item_id, item_name, is_active, created_at,
  inbound_total, outbound_total, on_hand
`;

export const INVENTORY_MOVEMENT_SELECT = `
  id, item_id, direction, quantity, note, member_id, created_by, created_at,
  remit_log_id,
  item:inventory_items!inventory_movements_item_id_fkey(id, name, is_active),
  member:profiles!inventory_movements_member_id_fkey(${PERSON}),
  logger:profiles!inventory_movements_created_by_fkey(${PERSON})
`;

export const STRATEGY_CATEGORY_SELECT = `
  id, name, sort_order, created_at
`;

export const STRATEGY_SELECT = `
  id, category_id, title, description, video_url, video_path,
  created_by, updated_by, created_at, updated_at,
  category:strategy_categories!strategies_category_id_fkey(id, name, sort_order),
  creator:profiles!strategies_created_by_fkey(${PERSON}),
  editor:profiles!strategies_updated_by_fkey(${PERSON})
`;
