-- week_start is stamped by a trigger, but PostgREST still treats a NOT NULL
-- column without a default as required on insert. A default lets the app omit
-- it entirely; the BEFORE INSERT trigger overwrites whatever lands here.
alter table public.remit_logs
  alter column week_start set default public.vanta_current_week_start();
