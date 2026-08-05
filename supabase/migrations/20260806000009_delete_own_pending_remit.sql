-- Members (and the staffer who filed for them) can delete pending remits they
-- own when they logged the wrong thing. Approved / rejected stays admin-only.

create policy "members delete own pending remit"
  on public.remit_logs
  for delete
  to authenticated
  using (
    public.vanta_current_rank() is not null
    and status = 'pending'
    and (
      submitted_by = auth.uid()
      or member_id = auth.uid()
    )
  );
