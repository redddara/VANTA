-- Remit: in-game cash contributed to the org, credited to a member.
--
-- Entries are always submitted pending and only count toward a member's total
-- once an admin approves them, so the person logging money cannot also bless it.

create table public.remit_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  description text check (description is null or char_length(description) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index remit_logs_member_id_idx on public.remit_logs (member_id);
create index remit_logs_status_idx on public.remit_logs (status);

alter table public.remit_logs enable row level security;

grant select, insert, update, delete on public.remit_logs to authenticated;

create policy "remit is visible to its member and to staff"
  on public.remit_logs
  for select
  to authenticated
  using (member_id = auth.uid() or public.vanta_is_staff());

-- `submitted_by = auth.uid()` means a contribution can never be filed under
-- someone else's name, and pinning the status closes off self-approval.
create policy "staff submit pending remit"
  on public.remit_logs
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and submitted_by = auth.uid()
    and status = 'pending'
  );

create policy "admins review and correct remit"
  on public.remit_logs
  for update
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

create policy "admins void remit"
  on public.remit_logs
  for delete
  to authenticated
  using (public.vanta_is_admin());

-- Stamped here rather than by the app so the reviewer on record is always the
-- JWT that actually made the call.
create or replace function public.vanta_stamp_remit_reviewer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger remit_logs_stamp_reviewer
  before update on public.remit_logs
  for each row execute function public.vanta_stamp_remit_reviewer();
