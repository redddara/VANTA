-- Enforcer+ (staff) may manage strategies and upload videos, not only Underboss+.

drop policy if exists "admins manage strategy categories" on public.strategy_categories;
create policy "staff manage strategy categories"
  on public.strategy_categories
  for all
  to authenticated
  using (public.vanta_is_staff())
  with check (public.vanta_is_staff());

drop policy if exists "admins insert strategies" on public.strategies;
drop policy if exists "admins update strategies" on public.strategies;
drop policy if exists "admins delete strategies" on public.strategies;

create policy "staff insert strategies"
  on public.strategies
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and created_by = auth.uid()
  );

create policy "staff update strategies"
  on public.strategies
  for update
  to authenticated
  using (public.vanta_is_staff())
  with check (
    public.vanta_is_staff()
    and updated_by = auth.uid()
  );

create policy "staff delete strategies"
  on public.strategies
  for delete
  to authenticated
  using (public.vanta_is_staff());

drop policy if exists "admins upload strategy videos" on storage.objects;
drop policy if exists "admins update strategy videos" on storage.objects;
drop policy if exists "admins delete strategy videos" on storage.objects;

create policy "staff upload strategy videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'strategy-videos'
    and public.vanta_is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "staff update strategy videos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'strategy-videos'
    and public.vanta_is_staff()
  )
  with check (
    bucket_id = 'strategy-videos'
    and public.vanta_is_staff()
  );

create policy "staff delete strategy videos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'strategy-videos'
    and public.vanta_is_staff()
  );
