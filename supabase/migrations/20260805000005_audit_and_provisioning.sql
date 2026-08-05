-- The audit log, and the trigger that turns a Discord sign-in into a profile.
--
-- Nothing writes to audit_log through the API. The insert, update and delete
-- grants are revoked outright and every entry arrives from a security definer
-- trigger, so history cannot be forged or erased even by an admin.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

revoke all on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

create policy "only admins read the audit log"
  on public.audit_log
  for select
  to authenticated
  using (public.vanta_is_admin());

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

-- Privileged changes to a member: who they are in the org and whether they can
-- still act. Recorded one row per field so the log reads as a history of
-- decisions rather than of database writes.
create or replace function public.vanta_audit_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    perform public.vanta_audit(
      'role.change', 'profiles', new.id,
      jsonb_build_object('role', jsonb_build_object('from', old.role, 'to', new.role))
    );
  end if;

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

create or replace function public.vanta_audit_remit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    -- Void keeps a full copy: the row is gone but the money it claimed is not
    -- forgotten.
    perform public.vanta_audit(
      'remit.delete', 'remit_logs', old.id,
      jsonb_build_object('deleted', to_jsonb(old))
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    perform public.vanta_audit(
      'remit.status', 'remit_logs', new.id,
      jsonb_build_object('status', jsonb_build_object('from', old.status, 'to', new.status))
    );
  end if;

  if new.amount is distinct from old.amount then
    diff := diff || jsonb_build_object(
      'amount', jsonb_build_object('from', old.amount, 'to', new.amount)
    );
  end if;

  if new.description is distinct from old.description then
    diff := diff || jsonb_build_object(
      'description', jsonb_build_object('from', old.description, 'to', new.description)
    );
  end if;

  if diff <> '{}'::jsonb then
    perform public.vanta_audit('remit.edit', 'remit_logs', new.id, diff);
  end if;

  return null;
end;
$$;

create trigger remit_logs_audit
  after update or delete on public.remit_logs
  for each row execute function public.vanta_audit_remit();

create or replace function public.vanta_audit_reputation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    perform public.vanta_audit(
      'reputation.delete', 'reputation_entries', old.id,
      jsonb_build_object('deleted', to_jsonb(old))
    );
    return null;
  end if;

  if new.points is distinct from old.points then
    diff := diff || jsonb_build_object(
      'points', jsonb_build_object('from', old.points, 'to', new.points)
    );
  end if;

  if new.reason is distinct from old.reason then
    diff := diff || jsonb_build_object(
      'reason', jsonb_build_object('from', old.reason, 'to', new.reason)
    );
  end if;

  if diff <> '{}'::jsonb then
    perform public.vanta_audit('reputation.edit', 'reputation_entries', new.id, diff);
  end if;

  return null;
end;
$$;

create trigger reputation_entries_audit
  after update or delete on public.reputation_entries
  for each row execute function public.vanta_audit_reputation();

-- Discord is the only way in, so a profile is provisioned from the OAuth
-- metadata the first time an account appears. The very first account to sign in
-- becomes the admin; there is nobody else who could promote them.
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
    id, discord_username, discord_avatar_url, ingame_name, role
  )
  values (
    new.id,
    handle,
    nullif(meta ->> 'avatar_url', ''),
    display,
    case when first_account then 'admin' else 'member' end
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
