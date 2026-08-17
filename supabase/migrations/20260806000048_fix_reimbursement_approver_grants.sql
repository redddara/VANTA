-- Upsert needs UPDATE privilege; we only granted select/insert/delete.
-- That made Kingpin hit RLS/permission errors when assigning approvers.

grant select, insert, update, delete on public.reimbursement_approvers to authenticated;

drop policy if exists "kingpin manage reimbursement approvers"
  on public.reimbursement_approvers;

create policy "kingpin insert reimbursement approvers"
  on public.reimbursement_approvers
  for insert
  to authenticated
  with check (public.vanta_current_rank() = 'Kingpin');

create policy "kingpin update reimbursement approvers"
  on public.reimbursement_approvers
  for update
  to authenticated
  using (public.vanta_current_rank() = 'Kingpin')
  with check (public.vanta_current_rank() = 'Kingpin');

create policy "kingpin delete reimbursement approvers"
  on public.reimbursement_approvers
  for delete
  to authenticated
  using (public.vanta_current_rank() = 'Kingpin');

-- Underboss must not remain as an approver unless a Kingpin re-adds them.
delete from public.reimbursement_approvers a
using public.profiles p
where a.member_id = p.id
  and p.crew_rank is distinct from 'Kingpin';

insert into public.reimbursement_approvers (member_id)
select p.id
from public.profiles p
where p.is_active
  and p.crew_rank = 'Kingpin'
on conflict do nothing;
