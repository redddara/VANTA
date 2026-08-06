-- Per-member Hacking Practice access, granted from Admin → Members (Kingpin).

alter table public.profiles
  add column if not exists hacking_practice_access boolean not null default false;

create or replace function public.vanta_guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if (new.crew_rank is distinct from old.crew_rank
      or new.is_active is distinct from old.is_active)
     and not public.vanta_is_admin() then
    raise exception 'Only an admin can change a member''s rank or status.';
  end if;

  if new.ingame_name is distinct from old.ingame_name
     and old.id is distinct from auth.uid()
     and public.vanta_current_rank() is distinct from 'Kingpin' then
    raise exception 'Only a Kingpin can rename another member.';
  end if;

  if new.hacking_practice_access is distinct from old.hacking_practice_access
     and public.vanta_current_rank() is distinct from 'Kingpin' then
    raise exception 'Only a Kingpin can grant Hacking Practice access.';
  end if;

  if new.crew_rank = 'Kingpin'
     and old.crew_rank is distinct from 'Kingpin'
     and public.vanta_current_rank() is distinct from 'Kingpin' then
    raise exception 'Only a Kingpin can grant the Kingpin rank.';
  end if;

  if (new.crew_rank is distinct from old.crew_rank
      or new.is_active is distinct from old.is_active)
     and old.crew_rank = 'Kingpin'
     and old.is_active
     and (new.crew_rank <> 'Kingpin' or not new.is_active)
     and not exists (
       select 1
       from public.profiles
       where crew_rank = 'Kingpin'
         and is_active
         and id <> old.id
     ) then
    raise exception 'Vanta needs at least one active Kingpin.';
  end if;

  return new;
end;
$$;

create or replace function public.vanta_audit_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_label text;
begin
  member_label := coalesce(
    nullif(new.ingame_name, ''),
    new.discord_username,
    new.id::text
  );

  if new.crew_rank is distinct from old.crew_rank then
    perform public.vanta_audit(
      'rank.change',
      'profiles',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'discord_username', new.discord_username,
        'crew_rank', jsonb_build_object('from', old.crew_rank, 'to', new.crew_rank)
      )
    );
  end if;

  if new.is_active is distinct from old.is_active then
    perform public.vanta_audit(
      case when new.is_active then 'member.reactivate' else 'member.deactivate' end,
      'profiles',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'discord_username', new.discord_username,
        'is_active', jsonb_build_object('from', old.is_active, 'to', new.is_active)
      )
    );
  end if;

  if new.ingame_name is distinct from old.ingame_name
     and old.id is distinct from auth.uid() then
    perform public.vanta_audit(
      'member.rename',
      'profiles',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'discord_username', new.discord_username,
        'ingame_name', jsonb_build_object('from', old.ingame_name, 'to', new.ingame_name)
      )
    );
  end if;

  if new.hacking_practice_access is distinct from old.hacking_practice_access then
    perform public.vanta_audit(
      case
        when new.hacking_practice_access then 'hacking.grant'
        else 'hacking.revoke'
      end,
      'profiles',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'discord_username', new.discord_username,
        'hacking_practice_access', jsonb_build_object(
          'from', old.hacking_practice_access,
          'to', new.hacking_practice_access
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
  p.hacking_practice_access,
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
