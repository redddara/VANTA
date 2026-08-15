-- Remit weeks are Monday–Sunday (Manila), not Sunday–Saturday.

create or replace function public.vanta_week_start(p_at timestamptz default now())
returns date
language sql
immutable
as $$
  -- Postgres DOW: Sunday=0 … Saturday=6.
  -- Days since Monday = (dow + 6) % 7.
  select (
    (timezone('Asia/Manila', p_at))::date
    - ((extract(dow from timezone('Asia/Manila', p_at))::integer + 6) % 7)
  );
$$;

create or replace function public.vanta_current_week_start()
returns date
language sql
stable
as $$
  select public.vanta_week_start(now());
$$;

-- Restamp normal remits from when they were logged.
update public.remit_logs
set
  week_start = public.vanta_week_start(created_at),
  target_week_start = public.vanta_week_start(created_at)
where coalesce(is_advance, false) = false;

-- Advance credits used Sunday week labels; shift those Sundays to the Monday
-- that opens the same Mon–Sun week (Sunday S → Monday S+1).
update public.remit_logs
set
  week_start = week_start + 1,
  target_week_start = coalesce(target_week_start, week_start) + 1
where coalesce(is_advance, false) = true
  and extract(dow from week_start) = 0;
