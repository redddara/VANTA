-- Allow any number of weekly-quota remit types. Compliance is tracked
-- per type (member × quota type) instead of a single shared ladder.

drop index if exists public.remit_types_one_weekly_quota_idx;

drop view if exists public.member_weekly_compliance;
drop function if exists public.vanta_weekly_laundering_totals();

create function public.vanta_weekly_laundering_totals()
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
    and l.week_start = public.vanta_current_week_start()
  group by l.member_id, l.remit_type_id;
$$;

grant execute on function public.vanta_weekly_laundering_totals() to authenticated;

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
cross join (
  select t.id, t.name, t.quota_amount
  from public.remit_types t
  where t.is_weekly_quota
) qt
left join public.vanta_weekly_laundering_totals() w
  on w.member_id = p.id
 and w.remit_type_id = qt.id
where p.is_active
  and (
    auth.uid() is null
    or p.id = auth.uid()
    or public.vanta_is_staff()
  );

grant select on public.member_weekly_compliance to authenticated;
