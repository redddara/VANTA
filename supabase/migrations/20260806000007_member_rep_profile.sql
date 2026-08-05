-- Drop the shared reputation ladder. Each member's payouts and unlocks are
-- entered one-by-one on member_rep so values can differ per person.

-- View depends on current_tier_id / rep_tiers; rebuild it at the end.
drop view if exists public.member_summary;

-- --- Copy ladder fields onto member_rep ------------------------------------

alter table public.member_rep
  add column if not exists tier_label text,
  add column if not exists house_rob_payout text,
  add column if not exists atm_payout text,
  add column if not exists launder_rate text,
  add column if not exists store_capacity text,
  add column if not exists gps_unlocked boolean not null default false,
  add column if not exists rope_unlocked boolean not null default false,
  add column if not exists nos_unlocked boolean not null default false,
  add column if not exists usb_unlocked boolean not null default false;

update public.member_rep mr
set
  tier_label = rt.tier_label,
  house_rob_payout = rt.house_rob_payout,
  atm_payout = rt.atm_payout,
  launder_rate = rt.launder_rate,
  store_capacity = rt.store_capacity,
  gps_unlocked = rt.gps_unlocked,
  rope_unlocked = rt.rope_unlocked,
  nos_unlocked = rt.nos_unlocked,
  usb_unlocked = rt.usb_unlocked
from public.rep_tiers rt
where rt.id = mr.current_tier_id;

-- Any row that somehow has no label after the copy gets a placeholder so the
-- new NOT NULL constraint can land.
update public.member_rep
set tier_label = 'Unnamed'
where tier_label is null or btrim(tier_label) = '';

alter table public.member_rep
  alter column tier_label set not null;

alter table public.member_rep
  drop constraint if exists member_rep_current_tier_id_fkey;

drop index if exists public.member_rep_current_tier_id_idx;

alter table public.member_rep
  drop column if exists current_tier_id;

-- --- Drop ladder ------------------------------------------------------------

drop policy if exists "anyone can read rep tiers" on public.rep_tiers;
drop policy if exists "admins manage rep tiers" on public.rep_tiers;
drop table if exists public.rep_tiers;

-- --- Audit: log the profile fields, not a tier id --------------------------

create or replace function public.vanta_audit_member_rep()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.vanta_audit(
      'rep.set',
      'member_rep',
      new.member_id,
      jsonb_build_object(
        'rep', jsonb_build_object(
          'from', null,
          'to', jsonb_build_object(
            'tier_label', new.tier_label,
            'house_rob_payout', new.house_rob_payout,
            'atm_payout', new.atm_payout,
            'launder_rate', new.launder_rate,
            'store_capacity', new.store_capacity,
            'gps_unlocked', new.gps_unlocked,
            'rope_unlocked', new.rope_unlocked,
            'nos_unlocked', new.nos_unlocked,
            'usb_unlocked', new.usb_unlocked
          )
        )
      )
    );
    return null;
  end if;

  if (
    new.tier_label is distinct from old.tier_label
    or new.house_rob_payout is distinct from old.house_rob_payout
    or new.atm_payout is distinct from old.atm_payout
    or new.launder_rate is distinct from old.launder_rate
    or new.store_capacity is distinct from old.store_capacity
    or new.gps_unlocked is distinct from old.gps_unlocked
    or new.rope_unlocked is distinct from old.rope_unlocked
    or new.nos_unlocked is distinct from old.nos_unlocked
    or new.usb_unlocked is distinct from old.usb_unlocked
  ) then
    perform public.vanta_audit(
      'rep.set',
      'member_rep',
      new.member_id,
      jsonb_build_object(
        'rep', jsonb_build_object(
          'from', jsonb_build_object(
            'tier_label', old.tier_label,
            'house_rob_payout', old.house_rob_payout,
            'atm_payout', old.atm_payout,
            'launder_rate', old.launder_rate,
            'store_capacity', old.store_capacity,
            'gps_unlocked', old.gps_unlocked,
            'rope_unlocked', old.rope_unlocked,
            'nos_unlocked', old.nos_unlocked,
            'usb_unlocked', old.usb_unlocked
          ),
          'to', jsonb_build_object(
            'tier_label', new.tier_label,
            'house_rob_payout', new.house_rob_payout,
            'atm_payout', new.atm_payout,
            'launder_rate', new.launder_rate,
            'store_capacity', new.store_capacity,
            'gps_unlocked', new.gps_unlocked,
            'rope_unlocked', new.rope_unlocked,
            'nos_unlocked', new.nos_unlocked,
            'usb_unlocked', new.usb_unlocked
          )
        )
      )
    );
  end if;

  return null;
end;
$$;

-- Policies keep the same names; only the wording of the model changed.
drop policy if exists "staff assign member tiers" on public.member_rep;
drop policy if exists "staff move members on the ladder" on public.member_rep;

create policy "staff set member reputation"
  on public.member_rep
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );

create policy "staff update member reputation"
  on public.member_rep
  for update
  to authenticated
  using (public.vanta_is_staff())
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );

-- --- Roster view reads fields from member_rep directly ---------------------

create view public.member_summary as
select
  p.id,
  p.discord_username,
  p.discord_avatar_url,
  p.ingame_name,
  p.crew_rank,
  p.is_active,
  p.created_at,
  mr.tier_label,
  mr.house_rob_payout,
  mr.atm_payout,
  mr.launder_rate,
  mr.store_capacity,
  mr.gps_unlocked,
  mr.rope_unlocked,
  mr.nos_unlocked,
  mr.usb_unlocked,
  t.total_approved_remit,
  t.pending_remit_count
from public.profiles p
join public.vanta_member_totals() t on t.member_id = p.id
left join public.member_rep mr on mr.member_id = p.id
where auth.uid() is null
   or p.id = auth.uid()
   or public.vanta_can_view_roster();

grant select on public.member_summary to authenticated;
