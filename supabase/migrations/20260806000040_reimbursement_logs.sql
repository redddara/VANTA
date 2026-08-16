-- Reimbursement / org-fund withdrawal logs.
--
-- own_expense: optional reimbursement request (none → pending → reimbursed|rejected)
-- org_withdrawal: mandatory record when org cash is pulled (status always recorded)

create table public.reimbursement_logs (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default (timezone('Asia/Manila', now()))::date,
  logged_by uuid not null references public.profiles (id) on delete cascade,
  entry_type text not null
    check (entry_type in ('own_expense', 'org_withdrawal')),
  purpose text not null
    check (char_length(purpose) between 1 and 500),
  amount numeric(14, 2) not null check (amount > 0),
  status text not null
    check (status in ('none', 'pending', 'reimbursed', 'rejected', 'recorded')),
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint reimbursement_status_matches_type check (
    (entry_type = 'org_withdrawal' and status = 'recorded')
    or (
      entry_type = 'own_expense'
      and status in ('none', 'pending', 'reimbursed', 'rejected')
    )
  )
);

create index reimbursement_logs_logged_by_idx
  on public.reimbursement_logs (logged_by);

create index reimbursement_logs_status_idx
  on public.reimbursement_logs (status);

create index reimbursement_logs_entry_date_idx
  on public.reimbursement_logs (entry_date desc);

alter table public.reimbursement_logs enable row level security;

revoke all on public.reimbursement_logs from authenticated;
grant select, insert, update, delete on public.reimbursement_logs to authenticated;

-- Everyone sees their own logs; staff see the full ledger.
create policy "read own or staff reimbursement logs"
  on public.reimbursement_logs
  for select
  to authenticated
  using (logged_by = auth.uid() or public.vanta_is_staff());

-- Any member can log their own expense (with or without a reimburse request).
create policy "members log own expense"
  on public.reimbursement_logs
  for insert
  to authenticated
  with check (
    public.vanta_current_rank() is not null
    and logged_by = auth.uid()
    and entry_type = 'own_expense'
    and status in ('none', 'pending')
  );

-- Staff must log org-fund withdrawals (process rule: mandatory when cash leaves).
create policy "staff log org withdrawals"
  on public.reimbursement_logs
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and logged_by = auth.uid()
    and entry_type = 'org_withdrawal'
    and status = 'recorded'
  );

-- Fund holders (Underboss+) confirm or reject reimbursement requests.
create policy "admins review reimbursement status"
  on public.reimbursement_logs
  for update
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

-- Members can delete their own open own-expense rows; admins can void any.
create policy "delete own open or admin void reimbursement"
  on public.reimbursement_logs
  for delete
  to authenticated
  using (
    public.vanta_is_admin()
    or (
      logged_by = auth.uid()
      and entry_type = 'own_expense'
      and status in ('none', 'pending')
    )
  );

create or replace function public.vanta_stamp_reimbursement_reviewer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and new.status in ('reimbursed', 'rejected', 'pending')
  then
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger reimbursement_logs_stamp_reviewer
  before update on public.reimbursement_logs
  for each row execute function public.vanta_stamp_reimbursement_reviewer();
