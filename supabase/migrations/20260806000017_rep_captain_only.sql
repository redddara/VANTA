-- Set Reputation is Captain+ only. Enforcers keep remit/inventory staff access.

create or replace function public.vanta_is_captain()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_rank_weight(public.vanta_current_rank()) >= 3;
$$;

grant execute on function public.vanta_is_captain() to authenticated;

drop policy if exists "staff set member reputation" on public.member_rep;
drop policy if exists "staff update member reputation" on public.member_rep;

create policy "captains set member reputation"
  on public.member_rep
  for insert
  to authenticated
  with check (
    public.vanta_is_captain()
    and updated_by = auth.uid()
  );

create policy "captains update member reputation"
  on public.member_rep
  for update
  to authenticated
  using (public.vanta_is_captain())
  with check (
    public.vanta_is_captain()
    and updated_by = auth.uid()
  );
