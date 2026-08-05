-- Orphaned auth.users rows (account exists, profiles row does not) used to leave
-- members stuck on a "no profile" login screen forever: the provision trigger
-- only fires on INSERT into auth.users, so a later Discord sign-in cannot heal
-- itself. This function is the self-heal path the auth callback calls.

create or replace function public.vanta_ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  meta jsonb;
  handle text;
  display text;
  avatar text;
  first_account boolean;
  result public.profiles;
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;

  select p.* into result
  from public.profiles p
  where p.id = uid;

  if found then
    return result;
  end if;

  select coalesce(u.raw_user_meta_data, '{}'::jsonb)
  into meta
  from auth.users u
  where u.id = uid;

  handle := coalesce(
    nullif(meta ->> 'user_name', ''),
    nullif(meta ->> 'preferred_username', ''),
    nullif(meta ->> 'full_name', '')
  );
  display := coalesce(
    nullif(meta -> 'custom_claims' ->> 'global_name', ''),
    handle,
    'Member'
  );
  avatar := nullif(meta ->> 'avatar_url', '');

  select not exists (select 1 from public.profiles) into first_account;

  insert into public.profiles (
    id, discord_username, discord_avatar_url, ingame_name, crew_rank
  )
  values (
    uid,
    handle,
    avatar,
    display,
    case when first_account then 'Kingpin' else 'Prospect' end
  )
  on conflict (id) do nothing;

  select p.* into result
  from public.profiles p
  where p.id = uid;

  if not found then
    raise exception 'Could not create a profile for this account.';
  end if;

  return result;
end;
$$;

grant execute on function public.vanta_ensure_profile() to authenticated;

-- Keep the insert-time trigger in sync with the same Discord field fallbacks.
create or replace function public.vanta_provision_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  handle text := coalesce(
    nullif(meta ->> 'user_name', ''),
    nullif(meta ->> 'preferred_username', ''),
    nullif(meta ->> 'full_name', '')
  );
  display text := coalesce(
    nullif(meta -> 'custom_claims' ->> 'global_name', ''),
    handle,
    'Member'
  );
  first_account boolean;
begin
  select not exists (select 1 from public.profiles) into first_account;

  insert into public.profiles (
    id, discord_username, discord_avatar_url, ingame_name, crew_rank
  )
  values (
    new.id,
    handle,
    nullif(meta ->> 'avatar_url', ''),
    display,
    case when first_account then 'Kingpin' else 'Prospect' end
  )
  on conflict (id) do nothing;

  return null;
end;
$$;
