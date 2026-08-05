-- Set Reputation stays Enforcer+ (staff). Operators never had write access;
-- restore staff policies after the brief Captain-only experiment.

drop policy if exists "captains set member reputation" on public.member_rep;
drop policy if exists "captains update member reputation" on public.member_rep;

create policy "staff set member reputation"
  on public.member_rep
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );

create policy "staff update member reputation"
  on public.member_rep
  for update
  to authenticated
  using (public.vanta_is_staff())
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );
