-- Collapse `role` and `crew_rank` into a single rank that grants the access.
--
-- Before this migration permissions came from `role` (member/officer/admin) and
-- `crew_rank` was a cosmetic title. Now there is one ladder:
--
--   Kingpin   5  everything, and the only rank that can appoint another Kingpin
--   Underboss 4  everything else an admin can do
--   Captain   3  submit remit for the crew, grant or dock reputation
--   Enforcer  2  the same
--   Operator  1  roster and their own history
--   Prospect  0  log their own remit and nothing else
--
-- Ranks are backfilled from the old `role` rather than the old title, so nobody
-- silently gains or loses access: an admin who was styled "Soldier" comes out a
-- Kingpin, not a Prospect.
--
-- This migration deliberately discovers the objects it replaces instead of
-- naming them. The schema it upgrades may have been applied by hand rather than
-- through this folder, and a policy or trigger left behind under a name we did
-- not predict would be a hole rather than a cosmetic problem: a surviving
-- permissive SELECT policy would still expose the roster, and a surviving
-- provisioning trigger would still try to insert the dropped `role` column and
-- break every new sign-in.

-- --- Clear the ground --------------------------------------------------------

-- Policies are permissive and therefore OR together, so every old one has to go
-- before the new set means anything.
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'remit_logs', 'reputation_entries', 'audit_log')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$$;

-- Every trigger on profiles is recreated below, so drop them all rather than
-- risk one that still reads `old.role`. tgisinternal excludes the constraint
-- triggers Postgres owns.
do $$
declare
  r record;
begin
  for r in
    select tgname
    from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger %I on public.profiles', r.tgname);
  end loop;
end
$$;

-- Same for the auth.users hooks, but only ours: Supabase's own triggers live in
-- the auth schema and must be left alone.
do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and n.nspname = 'public'
  loop
    execute format('drop trigger %I on auth.users', r.tgname);
  end loop;
end
$$;

-- The view reads profiles.role, so it has to go before the column can.
drop view if exists public.member_summary;

-- --- The rank column ---------------------------------------------------------

alter table public.profiles add column if not exists crew_rank text;
alter table public.profiles alter column crew_rank drop default;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    update public.profiles
    set crew_rank = case role
      when 'admin' then 'Kingpin'
      when 'officer' then 'Captain'
      else 'Operator'
    end;
  end if;
end
$$;

-- Anything the backfill did not reach (a database already on ranks, or a stray
-- legacy title) settles at the bottom of the ladder rather than blocking the
-- constraint below.
update public.profiles
set crew_rank = 'Prospect'
where crew_rank is null
   or crew_rank not in ('Prospect', 'Operator', 'Enforcer', 'Captain', 'Underboss', 'Kingpin');

alter table public.profiles drop constraint if exists profiles_crew_rank_check;

alter table public.profiles
  alter column crew_rank set not null,
  alter column crew_rank set default 'Prospect',
  add constraint profiles_crew_rank_check check (
    crew_rank in ('Prospect', 'Operator', 'Enforcer', 'Captain', 'Underboss', 'Kingpin')
  );

alter table public.profiles drop column if exists role;

-- --- Helpers ----------------------------------------------------------------

-- Immutable so it can be used freely inside policies without costing a lookup.
create or replace function public.vanta_rank_weight(p_rank text)
returns integer
language sql
immutable
as $$
  select case p_rank
    when 'Kingpin' then 5
    when 'Underboss' then 4
    when 'Captain' then 3
    when 'Enforcer' then 2
    when 'Operator' then 1
    when 'Prospect' then 0
    else -1
  end;
$$;

-- Null when the caller is signed out or deactivated, which is what strips a
-- retired member's write access without touching their rank.
create or replace function public.vanta_current_rank()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.crew_rank
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active;
$$;

create or replace function public.vanta_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_rank_weight(public.vanta_current_rank()) >= 4;
$$;

create or replace function public.vanta_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_rank_weight(public.vanta_current_rank()) >= 2;
$$;

-- Operator and up. A Prospect is inside the crew but not yet trusted with who
-- else is in it.
create or replace function public.vanta_can_view_roster()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_rank_weight(public.vanta_current_rank()) >= 1;
$$;

drop function if exists public.vanta_current_role();

grant execute on function public.vanta_rank_weight(text) to authenticated;
grant execute on function public.vanta_current_rank() to authenticated;
grant execute on function public.vanta_is_admin() to authenticated;
grant execute on function public.vanta_is_staff() to authenticated;
grant execute on function public.vanta_can_view_roster() to authenticated;

-- --- Policies ---------------------------------------------------------------

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.remit_logs to authenticated;
grant select, insert, update, delete on public.reputation_entries to authenticated;

create policy "profiles are readable by the crew"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.vanta_can_view_roster());

create policy "members maintain their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.vanta_is_admin())
  with check (id = auth.uid() or public.vanta_is_admin());

create policy "remit is visible to its member and to staff"
  on public.remit_logs
  for select
  to authenticated
  using (member_id = auth.uid() or public.vanta_is_staff());

-- The one thing a Prospect can do. Both ids are pinned to the caller, so this
-- policy can only ever log money against yourself.
create policy "members log their own remit"
  on public.remit_logs
  for insert
  to authenticated
  with check (
    public.vanta_current_rank() is not null
    and submitted_by = auth.uid()
    and member_id = auth.uid()
    and status = 'pending'
  );

create policy "staff submit remit for the crew"
  on public.remit_logs
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and submitted_by = auth.uid()
    and status = 'pending'
  );

create policy "admins review and correct remit"
  on public.remit_logs
  for update
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

create policy "admins void remit"
  on public.remit_logs
  for delete
  to authenticated
  using (public.vanta_is_admin());

create policy "reputation is visible to its member and to staff"
  on public.reputation_entries
  for select
  to authenticated
  using (member_id = auth.uid() or public.vanta_is_staff());

create policy "staff grant reputation"
  on public.reputation_entries
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and given_by = auth.uid()
  );

create policy "admins correct reputation"
  on public.reputation_entries
  for update
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

create policy "admins void reputation"
  on public.reputation_entries
  for delete
  to authenticated
  using (public.vanta_is_admin());

-- Created here if it is absent for the same reason the drops above are
-- catalog-driven: a hand-applied schema may never have had an audit log, and
-- vanta_audit below inserts into it unconditionally, so a missing table would
-- turn every rank change into a runtime error rather than a missing record.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Reasserted rather than assumed: the audit log is only readable, and only by
-- admins. Supabase grants all privileges on new public tables by default, so
-- the revoke is what makes history unforgeable.
revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

create policy "only admins read the audit log"
  on public.audit_log
  for select
  to authenticated
  using (public.vanta_is_admin());

-- --- Guards -----------------------------------------------------------------

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

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.vanta_guard_profile_update();

-- --- Audit ------------------------------------------------------------------

-- Recreated here so the profile audit trigger below cannot depend on a helper
-- that a hand-applied schema named something else.
create or replace function public.vanta_audit(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_detail jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_detail);
$$;

-- role.change is retired along with the column. Existing entries keep their
-- action name; only new writes are recorded as rank.change.
create or replace function public.vanta_audit_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.crew_rank is distinct from old.crew_rank then
    perform public.vanta_audit(
      'rank.change', 'profiles', new.id,
      jsonb_build_object('crew_rank', jsonb_build_object('from', old.crew_rank, 'to', new.crew_rank))
    );
  end if;

  if new.is_active is distinct from old.is_active then
    perform public.vanta_audit(
      case when new.is_active then 'member.reactivate' else 'member.deactivate' end,
      'profiles', new.id,
      jsonb_build_object('is_active', jsonb_build_object('from', old.is_active, 'to', new.is_active))
    );
  end if;

  return null;
end;
$$;

create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.vanta_audit_profile();

-- --- Provisioning -----------------------------------------------------------

-- Everyone starts as a Prospect and is promoted by hand. The first account to
-- sign in is the exception, because there is nobody yet to promote them.
create or replace function public.vanta_provision_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  handle text := nullif(meta ->> 'user_name', '');
  display text := coalesce(nullif(meta -> 'custom_claims' ->> 'global_name', ''), handle);
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.vanta_provision_profile();

-- Discord handles and avatars change. ingame_name is deliberately left alone:
-- it is seeded once and is the member's own to edit thereafter.
create or replace function public.vanta_sync_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  update public.profiles
  set discord_username = coalesce(nullif(meta ->> 'user_name', ''), discord_username),
      discord_avatar_url = coalesce(nullif(meta ->> 'avatar_url', ''), discord_avatar_url)
  where id = new.id;

  return null;
end;
$$;

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row
  when (new.raw_user_meta_data is distinct from old.raw_user_meta_data)
  execute function public.vanta_sync_profile_identity();

-- --- Roster view ------------------------------------------------------------

-- Dropped and recreated rather than replaced, so the column list is exactly
-- this whatever the previous definition looked like.
drop function if exists public.vanta_member_totals();

create function public.vanta_member_totals()
returns table (
  member_id uuid,
  total_rep bigint,
  total_approved_remit numeric,
  pending_remit_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce((
      select sum(r.points)
      from public.reputation_entries r
      where r.member_id = p.id
    ), 0)::bigint,
    coalesce((
      select sum(l.amount)
      from public.remit_logs l
      where l.member_id = p.id
        and l.status = 'approved'
    ), 0)::numeric,
    coalesce((
      select count(*)
      from public.remit_logs l
      where l.member_id = p.id
        and l.status = 'pending'
    ), 0)::bigint
  from public.profiles p;
$$;

grant execute on function public.vanta_member_totals() to authenticated;

-- Runs as its owner, so the row filter here is the only thing standing between
-- a Prospect and the roster. Totals stay crew-wide for Operator and up even
-- though the line items behind them are not.
create view public.member_summary as
select
  p.id,
  p.discord_username,
  p.discord_avatar_url,
  p.ingame_name,
  p.crew_rank,
  p.is_active,
  p.created_at,
  t.total_rep,
  t.total_approved_remit,
  t.pending_remit_count
from public.profiles p
join public.vanta_member_totals() t on t.member_id = p.id
where auth.uid() is null
   or p.id = auth.uid()
   or public.vanta_can_view_roster();

grant select on public.member_summary to authenticated;
