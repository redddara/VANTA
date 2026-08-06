-- Kingpin may set another member's in-game name. Members may still rename
-- themselves. Underboss and below cannot rename anyone else.

create or replace function public.vanta_guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Migrations and the SQL editor run without a JWT. Those callers are already
  -- privileged, so the column rules do not apply to them.
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

  -- Without this an Underboss could promote themselves level with the person
  -- who appointed them, and then demote them.
  if new.crew_rank = 'Kingpin'
     and old.crew_rank is distinct from 'Kingpin'
     and public.vanta_current_rank() is distinct from 'Kingpin' then
    raise exception 'Only a Kingpin can grant the Kingpin rank.';
  end if;

  -- Losing every Kingpin would need a trip to the SQL editor to undo.
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

  return null;
end;
$$;
