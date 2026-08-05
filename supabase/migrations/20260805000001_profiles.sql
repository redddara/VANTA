-- Profiles, the role helpers every policy is built on, and the profile rules.
--
-- Authorisation in this project lives in the database, not the application, so
-- the app can hold only the anon key. scripts/verify-migrations.mjs exercises
-- every rule below against a real Postgres.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  discord_username text,
  discord_avatar_url text,
  ingame_name text,
  crew_rank text default 'Recruit',
  role text not null default 'member'
    check (role in ('member', 'officer', 'admin')),
  is_active boolean not null default true
);

alter table public.profiles enable row level security;

-- No insert or delete grant: rows are created by the auth trigger in
-- 20260805000005 and retired with is_active rather than deleted.
grant select, update on public.profiles to authenticated;

-- The caller's role, or null when they are signed out or deactivated. Marked
-- security definer for two reasons: it has to read profiles from inside the
-- policies on profiles without recursing, and a deactivated member must not be
-- able to hide their own status.
create or replace function public.vanta_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active;
$$;

create or replace function public.vanta_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_current_role() in ('officer', 'admin');
$$;

create or replace function public.vanta_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_current_role() = 'admin';
$$;

grant execute on function public.vanta_current_role() to authenticated;
grant execute on function public.vanta_is_staff() to authenticated;
grant execute on function public.vanta_is_admin() to authenticated;

-- The roster is public to the crew: everyone can see who everyone is.
create policy "profiles are readable by the crew"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Row level security decides *which rows* you may touch; the guard trigger
-- below decides *which columns*. Both are needed: this policy alone would let a
-- member rewrite their own role.
create policy "members maintain their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.vanta_is_admin())
  with check (id = auth.uid() or public.vanta_is_admin());

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

  if (new.role is distinct from old.role
      or new.crew_rank is distinct from old.crew_rank
      or new.is_active is distinct from old.is_active)
     and not public.vanta_is_admin() then
    raise exception 'Only an admin can change a member''s role, rank or status.';
  end if;

  -- Locking every admin out of the portal would need a trip to the SQL editor
  -- to undo, so refuse to remove the last one.
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active)
     and old.role = 'admin'
     and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and not exists (
       select 1
       from public.profiles
       where role = 'admin'
         and is_active
         and id <> old.id
     ) then
    raise exception 'Vanta needs at least one active admin.';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.vanta_guard_profile_update();
