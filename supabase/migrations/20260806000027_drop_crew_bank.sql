-- Crew bank was added then withdrawn; drop the ledger until it's needed again.

drop view if exists public.bank_summary;
drop function if exists public.vanta_bank_balance();
drop function if exists public.vanta_audit_bank_movement() cascade;
drop function if exists public.vanta_guard_bank_withdraw() cascade;
drop function if exists public.vanta_stamp_bank_movement() cascade;
drop table if exists public.bank_movements;
