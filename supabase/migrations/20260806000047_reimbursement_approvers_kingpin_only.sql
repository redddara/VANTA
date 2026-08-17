-- Only Kingpin may assign reimbursement approvers (not Underboss).
-- Drop Underboss from the seeded list; keep active Kingpins.

drop policy if exists "admins manage reimbursement approvers"
  on public.reimbursement_approvers;

create policy "kingpin manage reimbursement approvers"
  on public.reimbursement_approvers
  for all
  to authenticated
  using (public.vanta_current_rank() = 'Kingpin')
  with check (public.vanta_current_rank() = 'Kingpin');

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
