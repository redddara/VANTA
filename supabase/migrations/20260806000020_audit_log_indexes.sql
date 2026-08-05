-- Faster filtered / paginated reads on the append-only audit log.
create index if not exists audit_log_action_created_at_idx
  on public.audit_log (action, created_at desc);
