-- Only designated members may approve/reject reimbursement requests.
-- reviewed_by already exists; stamp it on reimbursed/rejected and clear on reopen.

create table public.reimbursement_approvers (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.reimbursement_approvers enable row level security;

revoke all on public.reimbursement_approvers from authenticated;
grant select, insert, delete on public.reimbursement_approvers to authenticated;

-- Everyone can see who the fund holders are.
create policy "read reimbursement approvers"
  on public.reimbursement_approvers
  for select
  to authenticated
  using (public.vanta_current_rank() is not null);

-- Underboss+ pick who can approve.
create policy "admins manage reimbursement approvers"
  on public.reimbursement_approvers
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

create or replace function public.vanta_can_review_reimbursement()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.reimbursement_approvers a
    where a.member_id = auth.uid()
  );
$$;

grant execute on function public.vanta_can_review_reimbursement() to authenticated;

-- Approvers (and staff) need to read the full ledger to run the queue.
drop policy if exists "read own or staff reimbursement logs" on public.reimbursement_logs;
create policy "read own staff or approver reimbursement logs"
  on public.reimbursement_logs
  for select
  to authenticated
  using (
    logged_by = auth.uid()
    or public.vanta_is_staff()
    or public.vanta_can_review_reimbursement()
  );

drop policy if exists "admins review reimbursement status" on public.reimbursement_logs;
create policy "approvers review reimbursement status"
  on public.reimbursement_logs
  for update
  to authenticated
  using (public.vanta_can_review_reimbursement())
  with check (public.vanta_can_review_reimbursement());

-- Stamp who reimbursed/rejected; clear when reopened to pending.
create or replace function public.vanta_stamp_reimbursement_reviewer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('reimbursed', 'rejected') then
      new.reviewed_by := auth.uid();
    elsif new.status = 'pending' then
      new.reviewed_by := null;
    end if;
  end if;
  return new;
end;
$$;

-- Let designated approvers (not only staff) open proof images on the queue.
drop policy if exists "crew read reimbursement proofs" on storage.objects;
create policy "crew read reimbursement proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'reimbursement-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.vanta_is_staff()
      or public.vanta_can_review_reimbursement()
      or exists (
        select 1
        from public.reimbursement_logs r
        where r.proof_path = name
          and r.logged_by = auth.uid()
      )
    )
  );

-- Start with active Underboss+ so existing fund holders keep access.
insert into public.reimbursement_approvers (member_id)
select p.id
from public.profiles p
where p.is_active
  and public.vanta_rank_weight(p.crew_rank) >= 4
on conflict do nothing;
