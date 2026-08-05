-- The roster view.
--
-- Totals are crew-wide knowledge even though the line items behind them are
-- not: any member can see that someone has banked $2m without being able to
-- read the individual entries. That is why this runs as its owner instead of
-- the caller, and why it exposes aggregates only.

create or replace function public.vanta_member_totals()
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

create view public.member_summary as
select
  p.id,
  p.discord_username,
  p.discord_avatar_url,
  p.ingame_name,
  p.crew_rank,
  p.role,
  p.is_active,
  p.created_at,
  t.total_rep,
  t.total_approved_remit,
  t.pending_remit_count
from public.profiles p
join public.vanta_member_totals() t on t.member_id = p.id;

-- Deactivated members stay in the view so their history and totals survive
-- being retired. Callers filter on is_active when they want the active roster.
grant select on public.member_summary to authenticated;
