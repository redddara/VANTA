-- Reputation: standing within the crew, granted or docked by staff.
--
-- Unlike remit there is no approval step, so entries take effect immediately
-- and a reason is mandatory. Corrections are an admin job and are audited.

create table public.reputation_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  points integer not null check (points <> 0 and abs(points) <= 1000),
  reason text not null check (char_length(btrim(reason)) >= 3),
  given_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index reputation_entries_member_id_idx on public.reputation_entries (member_id);

alter table public.reputation_entries enable row level security;

grant select, insert, update, delete on public.reputation_entries to authenticated;

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
