-- 1) High / Mid / Low reputation band on each member profile.
-- 2) Split Chopmats into five material types.

-- --- Reputation band --------------------------------------------------------

alter table public.member_rep
  add column if not exists rep_band text;

update public.member_rep
set rep_band = 'mid'
where rep_band is null;

alter table public.member_rep
  alter column rep_band set not null;

alter table public.member_rep
  drop constraint if exists member_rep_rep_band_check;

alter table public.member_rep
  add constraint member_rep_rep_band_check
  check (rep_band in ('low', 'mid', 'high'));

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
            'rep_band', new.rep_band,
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
    new.rep_band is distinct from old.rep_band
    or new.tier_label is distinct from old.tier_label
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
            'rep_band', old.rep_band,
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
            'rep_band', new.rep_band,
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

drop view if exists public.member_summary;

create view public.member_summary as
select
  p.id,
  p.discord_username,
  p.discord_avatar_url,
  p.ingame_name,
  p.crew_rank,
  p.is_active,
  p.created_at,
  mr.rep_band,
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

-- --- Chopmats materials -----------------------------------------------------

insert into public.remit_types (name, is_weekly_quota, quota_amount)
select v.name, false, null
from (
  values
    ('Chopmats — Aluminum'),
    ('Chopmats — Copper'),
    ('Chopmats — Steel'),
    ('Chopmats — Metal Scrap'),
    ('Chopmats — Electronics')
) as v(name)
where not exists (
  select 1 from public.remit_types t where t.name = v.name
);

-- Move any existing Chopmats logs onto Aluminum, then remove the generic type.
update public.remit_logs l
set remit_type_id = n.id
from public.remit_types o
join public.remit_types n on n.name = 'Chopmats — Aluminum'
where o.name = 'Chopmats'
  and l.remit_type_id = o.id;

delete from public.remit_types
where name = 'Chopmats';
