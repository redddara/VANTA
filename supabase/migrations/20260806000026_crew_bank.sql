-- Crew bank / funds ledger. Separate from remit (member contributions) and
-- inventory (stash items): this tracks shared cash on hand.

create table public.bank_movements (
  id uuid primary key default gen_random_uuid(),
  direction text not null,
  amount numeric(14, 2) not null,
  note text,
  member_id uuid references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint bank_movements_direction_check
    check (direction in ('deposit', 'withdraw')),
  constraint bank_movements_amount_check
    check (amount > 0 and amount <= 1000000000),
  constraint bank_movements_note_len
    check (note is null or char_length(note) <= 500)
);

create index bank_movements_created_idx
  on public.bank_movements (created_at desc);

alter table public.bank_movements enable row level security;

revoke all on public.bank_movements from authenticated;
grant select, insert, delete on public.bank_movements to authenticated;

create policy "staff read bank movements"
  on public.bank_movements
  for select
  to authenticated
  using (public.vanta_is_staff());

create policy "staff log bank movements"
  on public.bank_movements
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and created_by = auth.uid()
  );

create policy "admins void bank movements"
  on public.bank_movements
  for delete
  to authenticated
  using (public.vanta_is_admin());

create or replace function public.vanta_stamp_bank_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger bank_movements_stamp
  before insert on public.bank_movements
  for each row execute function public.vanta_stamp_bank_movement();

-- Refuse withdraw that would drive the bank below zero.
create or replace function public.vanta_guard_bank_withdraw()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  on_hand numeric;
begin
  if new.direction <> 'withdraw' then
    return new;
  end if;

  select coalesce(sum(
    case when m.direction = 'deposit' then m.amount else -m.amount end
  ), 0)
    into on_hand
  from public.bank_movements m;

  if on_hand < new.amount then
    raise exception 'Not enough funds (have %, need %)', on_hand, new.amount
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger bank_movements_guard_withdraw
  before insert on public.bank_movements
  for each row execute function public.vanta_guard_bank_withdraw();

create or replace function public.vanta_bank_balance()
returns table (
  deposit_total numeric,
  withdraw_total numeric,
  on_hand numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(case when m.direction = 'deposit' then m.amount else 0 end), 0)::numeric,
    coalesce(sum(case when m.direction = 'withdraw' then m.amount else 0 end), 0)::numeric,
    coalesce(sum(
      case when m.direction = 'deposit' then m.amount else -m.amount end
    ), 0)::numeric
  from public.bank_movements m;
$$;

grant execute on function public.vanta_bank_balance() to authenticated;

-- Single-row view; empty ledger still returns zeros for staff.
create view public.bank_summary as
select
  coalesce(b.deposit_total, 0)::numeric as deposit_total,
  coalesce(b.withdraw_total, 0)::numeric as withdraw_total,
  coalesce(b.on_hand, 0)::numeric as on_hand
from (select 1) stub
left join lateral public.vanta_bank_balance() b on true
where public.vanta_is_staff();

grant select on public.bank_summary to authenticated;

create or replace function public.vanta_audit_bank_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_label text;
begin
  if tg_op = 'DELETE' then
    perform public.vanta_audit(
      'bank.void',
      'bank_movements',
      old.id,
      jsonb_build_object('deleted', to_jsonb(old))
    );
    return null;
  end if;

  if new.member_id is not null then
    select coalesce(nullif(p.ingame_name, ''), p.discord_username, p.id::text)
      into member_label
    from public.profiles p
    where p.id = new.member_id;
  end if;

  perform public.vanta_audit(
    case when new.direction = 'deposit' then 'bank.deposit' else 'bank.withdraw' end,
    'bank_movements',
    new.id,
    jsonb_build_object(
      'direction', new.direction,
      'amount', new.amount,
      'note', new.note,
      'member', member_label
    )
  );

  return null;
end;
$$;

create trigger bank_movements_audit
  after insert or delete on public.bank_movements
  for each row execute function public.vanta_audit_bank_movement();
