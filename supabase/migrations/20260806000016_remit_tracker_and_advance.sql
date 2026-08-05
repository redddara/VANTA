-- Remit tracker: historical weekly compliance RPC + advance remits that
-- credit a chosen Manila week instead of the week they were logged.

alter table public.remit_logs
  add column if not exists target_week_start date,
  add column if not exists is_advance boolean not null default false;

update public.remit_logs
set target_week_start = week_start
where target_week_start is null;

alter table public.remit_logs
  alter column target_week_start set default public.vanta_current_week_start();

-- Stamp week from an optional advance target; otherwise from created_at.
create or replace function public.vanta_stamp_remit_week()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  logged_week date := public.vanta_week_start(coalesce(new.created_at, now()));
  chosen date;
begin
  if tg_op = 'INSERT' then
    if new.target_week_start is not null then
      chosen := public.vanta_week_start(
        (new.target_week_start::text || ' 12:00:00')::timestamp
          at time zone 'Asia/Manila'
      );
    else
      chosen := logged_week;
    end if;
    new.week_start := chosen;
    new.target_week_start := chosen;
    new.is_advance := chosen > logged_week;
    return new;
  end if;

  -- Retargeting an existing row (advance management).
  if new.target_week_start is distinct from old.target_week_start
     and new.target_week_start is not null
  then
    chosen := public.vanta_week_start(
      (new.target_week_start::text || ' 12:00:00')::timestamp
        at time zone 'Asia/Manila'
    );
    new.week_start := chosen;
    new.target_week_start := chosen;
    new.is_advance := chosen > public.vanta_week_start(coalesce(new.created_at, now()));
  else
    -- Clients cannot rewrite week_start directly.
    new.week_start := old.week_start;
    new.target_week_start := old.target_week_start;
    new.is_advance := old.is_advance;
  end if;

  return new;
end;
$$;

-- Totals for any week (used by tracker history).
create or replace function public.vanta_weekly_totals_for(p_week date)
returns table (
  member_id uuid,
  remit_type_id uuid,
  approved_quantity bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.member_id,
    l.remit_type_id,
    coalesce(sum(l.quantity), 0)::bigint
  from public.remit_logs l
  join public.remit_types t on t.id = l.remit_type_id
  where t.is_weekly_quota
    and l.status = 'approved'
    and l.week_start = public.vanta_week_start(
      (p_week::text || ' 12:00:00')::timestamp at time zone 'Asia/Manila'
    )
  group by l.member_id, l.remit_type_id;
$$;

grant execute on function public.vanta_weekly_totals_for(date) to authenticated;

-- Keep the zero-arg helper as "current week".
create or replace function public.vanta_weekly_laundering_totals()
returns table (
  member_id uuid,
  remit_type_id uuid,
  approved_quantity bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.vanta_weekly_totals_for(public.vanta_current_week_start());
$$;

-- Compliance for an arbitrary week. Staff see everyone; members see themselves.
create or replace function public.vanta_member_week_compliance(p_week date)
returns table (
  member_id uuid,
  discord_username text,
  discord_avatar_url text,
  ingame_name text,
  crew_rank text,
  is_active boolean,
  week_start date,
  quota_type_id uuid,
  quota_type_name text,
  quota_amount integer,
  approved_quantity bigint,
  quota_met boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with week as (
    select public.vanta_week_start(
      (p_week::text || ' 12:00:00')::timestamp at time zone 'Asia/Manila'
    ) as start
  )
  select
    p.id as member_id,
    p.discord_username,
    p.discord_avatar_url,
    p.ingame_name,
    p.crew_rank::text,
    p.is_active,
    week.start as week_start,
    qt.id as quota_type_id,
    qt.name as quota_type_name,
    qt.quota_amount,
    coalesce(w.approved_quantity, 0)::bigint as approved_quantity,
    coalesce(w.approved_quantity, 0) >= qt.quota_amount as quota_met
  from public.profiles p
  cross join week
  cross join (
    select t.id, t.name, t.quota_amount
    from public.remit_types t
    where t.is_weekly_quota
  ) qt
  left join public.vanta_weekly_totals_for((select start from week)) w
    on w.member_id = p.id
   and w.remit_type_id = qt.id
  where p.is_active
    and (
      auth.uid() is null
      or p.id = auth.uid()
      or public.vanta_is_staff()
    );
$$;

grant execute on function public.vanta_member_week_compliance(date) to authenticated;

-- Sundays that have remit activity, for tracker month pickers.
create or replace function public.vanta_remit_week_starts()
returns table (week_start date)
language sql
stable
security definer
set search_path = public
as $$
  select distinct l.week_start
  from public.remit_logs l
  where public.vanta_is_staff()
     or l.member_id = auth.uid()
  order by 1 desc;
$$;

grant execute on function public.vanta_remit_week_starts() to authenticated;
