-- Reputation is a job-progression ladder, not a points ledger.
--
-- Each row in rep_tiers is a crew-wide level (payouts + crafting unlocks).
-- member_rep holds only a member's current tier — no history of runs, no
-- accumulating score. Staff move people up and down; admins edit the ladder.
--
-- Existing reputation_entries rows (if any) are archived, not deleted.

-- --- Archive the points ledger ----------------------------------------------

do $$
declare
  r record;
begin
  if to_regclass('public.reputation_entries') is null then
    return;
  end if;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reputation_entries'
  loop
    execute format('drop policy %I on public.reputation_entries', r.policyname);
  end loop;

  for r in
    select tgname
    from pg_trigger
    where tgrelid = 'public.reputation_entries'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger %I on public.reputation_entries', r.tgname);
  end loop;
end
$$;

drop function if exists public.vanta_audit_reputation();

alter table if exists public.reputation_entries
  rename to reputation_entries_legacy;

alter index if exists reputation_entries_member_id_idx
  rename to reputation_entries_legacy_member_id_idx;

-- Archived: no API access. Kept only so old rows are not silently erased.
revoke all on table public.reputation_entries_legacy from authenticated;

-- --- Ladder -----------------------------------------------------------------

create table public.rep_tiers (
  id uuid primary key default gen_random_uuid(),
  level_order integer not null unique,
  tier_label text not null,
  house_rob_payout text,
  atm_payout text,
  launder_rate text,
  store_capacity text,
  gps_unlocked boolean not null default false,
  rope_unlocked boolean not null default false,
  nos_unlocked boolean not null default false,
  usb_unlocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.member_rep (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  current_tier_id uuid not null references public.rep_tiers (id),
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

create index member_rep_current_tier_id_idx on public.member_rep (current_tier_id);

alter table public.rep_tiers enable row level security;
alter table public.member_rep enable row level security;

grant select on public.rep_tiers to authenticated;
grant insert, update, delete on public.rep_tiers to authenticated;

grant select on public.member_rep to authenticated;
grant insert, update on public.member_rep to authenticated;

-- Everyone signed in can read the ladder (including Prospects — they need to
-- see what the next level unlocks). Only admins rebalance payouts.
create policy "anyone can read rep tiers"
  on public.rep_tiers
  for select
  to authenticated
  using (true);

create policy "admins manage rep tiers"
  on public.rep_tiers
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

-- Current tier is roster knowledge. Staff place people on the ladder; members
-- start with no row until someone assigns one.
create policy "anyone can read member rep"
  on public.member_rep
  for select
  to authenticated
  using (true);

create policy "staff assign member tiers"
  on public.member_rep
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );

create policy "staff move members on the ladder"
  on public.member_rep
  for update
  to authenticated
  using (public.vanta_is_staff())
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );

-- --- Audit tier moves -------------------------------------------------------

create or replace function public.vanta_audit_member_rep()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_label text;
  to_label text;
begin
  if tg_op = 'INSERT' then
    select tier_label into to_label from public.rep_tiers where id = new.current_tier_id;
    perform public.vanta_audit(
      'rep.tier_change',
      'member_rep',
      new.member_id,
      jsonb_build_object(
        'tier', jsonb_build_object(
          'from', null,
          'to', to_label,
          'from_id', null,
          'to_id', new.current_tier_id
        )
      )
    );
    return null;
  end if;

  if new.current_tier_id is distinct from old.current_tier_id then
    select tier_label into from_label from public.rep_tiers where id = old.current_tier_id;
    select tier_label into to_label from public.rep_tiers where id = new.current_tier_id;
    perform public.vanta_audit(
      'rep.tier_change',
      'member_rep',
      new.member_id,
      jsonb_build_object(
        'tier', jsonb_build_object(
          'from', from_label,
          'to', to_label,
          'from_id', old.current_tier_id,
          'to_id', new.current_tier_id
        )
      )
    );
  end if;

  return null;
end;
$$;

create trigger member_rep_audit
  after insert or update on public.member_rep
  for each row execute function public.vanta_audit_member_rep();

create or replace function public.vanta_touch_member_rep()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger member_rep_touch
  before update on public.member_rep
  for each row execute function public.vanta_touch_member_rep();

-- --- Roster view ------------------------------------------------------------

drop view if exists public.member_summary;
drop function if exists public.vanta_member_totals();

create function public.vanta_member_totals()
returns table (
  member_id uuid,
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

-- Tier columns are null until staff assigns a member_rep row. Remit aggregates
-- stay crew-wide for Operator and up; Prospects still only see themselves.
create view public.member_summary as
select
  p.id,
  p.discord_username,
  p.discord_avatar_url,
  p.ingame_name,
  p.crew_rank,
  p.is_active,
  p.created_at,
  mr.current_tier_id,
  rt.level_order as tier_level_order,
  rt.tier_label,
  rt.house_rob_payout,
  rt.atm_payout,
  rt.launder_rate,
  rt.store_capacity,
  rt.gps_unlocked,
  rt.rope_unlocked,
  rt.nos_unlocked,
  rt.usb_unlocked,
  t.total_approved_remit,
  t.pending_remit_count
from public.profiles p
join public.vanta_member_totals() t on t.member_id = p.id
left join public.member_rep mr on mr.member_id = p.id
left join public.rep_tiers rt on rt.id = mr.current_tier_id
where auth.uid() is null
   or p.id = auth.uid()
   or public.vanta_can_view_roster();

grant select on public.member_summary to authenticated;
