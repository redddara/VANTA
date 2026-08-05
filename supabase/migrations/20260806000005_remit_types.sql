-- Remit is typed contributions, not a flat cash amount.
--
-- remit_types is the admin-editable catalog. Exactly one type carries the
-- weekly quota (Laundering Contract × 2). remit_logs gains type, quantity and
-- a server-stamped week_start (Sunday in Asia/Manila) so compliance math never
-- depends on the client clock.
--
-- Evolves remit_logs in place: live data was empty at cutover, and the table
-- name stays so existing policies/triggers can be rewritten rather than lost.

-- --- Catalog ----------------------------------------------------------------

create table public.remit_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_weekly_quota boolean not null default false,
  quota_amount integer
    check (
      (is_weekly_quota and quota_amount is not null and quota_amount > 0)
      or (not is_weekly_quota and quota_amount is null)
    ),
  created_at timestamptz not null default now()
);

-- At most one weekly-quota type. Enforced so compliance always has a single
-- target to measure against.
create unique index remit_types_one_weekly_quota_idx
  on public.remit_types ((true))
  where is_weekly_quota;

alter table public.remit_types enable row level security;

grant select on public.remit_types to authenticated;
grant insert, update, delete on public.remit_types to authenticated;

create policy "anyone can read remit types"
  on public.remit_types
  for select
  to authenticated
  using (true);

create policy "admins manage remit types"
  on public.remit_types
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

insert into public.remit_types (name, is_weekly_quota, quota_amount) values
  ('Laundering Contract', true, 2),
  ('Stolen Materials', false, null),
  ('Recyclable Materials', false, null),
  ('Chopmats', false, null),
  ('Marked Bills', false, null),
  ('Credit Slips', false, null),
  ('Chop Car Contract', false, null),
  ('Tech Components', false, null);

-- --- Week boundary (Asia/Manila, Sunday start) ------------------------------

-- DOW in Postgres: Sunday = 0. Subtract that many days from the Manila calendar
-- date to land on the Sunday that opens the week.
create or replace function public.vanta_week_start(p_at timestamptz default now())
returns date
language sql
immutable
as $$
  select (
    (timezone('Asia/Manila', p_at))::date
    - extract(dow from timezone('Asia/Manila', p_at))::integer
  );
$$;

create or replace function public.vanta_current_week_start()
returns date
language sql
stable
as $$
  select public.vanta_week_start(now());
$$;

grant execute on function public.vanta_week_start(timestamptz) to authenticated;
grant execute on function public.vanta_current_week_start() to authenticated;

-- --- Evolve remit_logs ------------------------------------------------------

alter table public.remit_logs
  add column if not exists remit_type_id uuid references public.remit_types (id),
  add column if not exists quantity integer,
  add column if not exists week_start date;

-- Any pre-existing cash rows (none expected) become Laundering Contract × 1 for
-- the week of their created_at, so the new NOT NULL columns can land.
update public.remit_logs l
set
  remit_type_id = t.id,
  quantity = coalesce(l.quantity, 1),
  week_start = public.vanta_week_start(l.created_at)
from public.remit_types t
where t.name = 'Laundering Contract'
  and (l.remit_type_id is null or l.quantity is null or l.week_start is null);

alter table public.remit_logs
  alter column remit_type_id set not null,
  alter column quantity set not null,
  alter column quantity set default 1,
  alter column week_start set not null;

alter table public.remit_logs
  drop constraint if exists remit_logs_amount_check;

alter table public.remit_logs
  alter column amount drop not null;

alter table public.remit_logs
  add constraint remit_logs_amount_check
    check (amount is null or amount > 0);

alter table public.remit_logs
  drop constraint if exists remit_logs_quantity_check;

alter table public.remit_logs
  add constraint remit_logs_quantity_check
    check (quantity > 0 and quantity <= 100000);

create index if not exists remit_logs_remit_type_id_idx
  on public.remit_logs (remit_type_id);

create index if not exists remit_logs_week_start_idx
  on public.remit_logs (week_start);

create index if not exists remit_logs_member_week_type_idx
  on public.remit_logs (member_id, week_start, remit_type_id);

-- Always stamp week_start from created_at. Clients never choose the week.
create or replace function public.vanta_stamp_remit_week()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.week_start := public.vanta_week_start(coalesce(new.created_at, now()));
  return new;
end;
$$;

drop trigger if exists remit_logs_stamp_week on public.remit_logs;

create trigger remit_logs_stamp_week
  before insert or update on public.remit_logs
  for each row execute function public.vanta_stamp_remit_week();

-- Audit quantity (and type) edits alongside amount/description.
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

  if new.quantity is distinct from old.quantity then
    diff := diff || jsonb_build_object(
      'quantity', jsonb_build_object('from', old.quantity, 'to', new.quantity)
    );
  end if;

  if new.remit_type_id is distinct from old.remit_type_id then
    diff := diff || jsonb_build_object(
      'remit_type_id', jsonb_build_object('from', old.remit_type_id, 'to', new.remit_type_id)
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

-- --- Weekly compliance ------------------------------------------------------

-- Security definer so Operators who can see the roster but not other members'
-- remit line items still get an honest zero rather than a false "met".
create or replace function public.vanta_weekly_laundering_totals()
returns table (
  member_id uuid,
  approved_quantity bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.member_id,
    coalesce(sum(l.quantity), 0)::bigint
  from public.remit_logs l
  join public.remit_types t on t.id = l.remit_type_id
  where t.is_weekly_quota
    and l.status = 'approved'
    and l.week_start = public.vanta_current_week_start()
  group by l.member_id;
$$;

grant execute on function public.vanta_weekly_laundering_totals() to authenticated;

drop view if exists public.member_weekly_compliance;

create view public.member_weekly_compliance as
select
  p.id as member_id,
  p.discord_username,
  p.discord_avatar_url,
  p.ingame_name,
  p.crew_rank,
  p.is_active,
  public.vanta_current_week_start() as week_start,
  qt.id as quota_type_id,
  qt.name as quota_type_name,
  qt.quota_amount,
  coalesce(w.approved_quantity, 0)::bigint as approved_quantity,
  coalesce(w.approved_quantity, 0) >= qt.quota_amount as quota_met
from public.profiles p
cross join lateral (
  select t.id, t.name, t.quota_amount
  from public.remit_types t
  where t.is_weekly_quota
  limit 1
) qt
left join public.vanta_weekly_laundering_totals() w on w.member_id = p.id
where p.is_active
  and (
    auth.uid() is null
    or p.id = auth.uid()
    or public.vanta_is_staff()
  );

grant select on public.member_weekly_compliance to authenticated;
