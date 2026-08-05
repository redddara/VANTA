-- Crew stash ledger: catalog of items, inbound/outbound movements, and an
-- on-hand stock view. Separate from remit_logs (member contributions) so the
-- warehouse can move stock without affecting weekly quotas.

-- --- Catalog ----------------------------------------------------------------

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint inventory_items_name_unique unique (name),
  constraint inventory_items_name_len check (char_length(name) between 1 and 80)
);

create index inventory_items_active_name_idx
  on public.inventory_items (is_active, name);

alter table public.inventory_items enable row level security;

revoke all on public.inventory_items from authenticated;
grant select on public.inventory_items to authenticated;
grant insert, update, delete on public.inventory_items to authenticated;

create policy "staff read inventory items"
  on public.inventory_items
  for select
  to authenticated
  using (public.vanta_is_staff());

create policy "admins manage inventory items"
  on public.inventory_items
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

-- --- Movements --------------------------------------------------------------

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items (id) on delete restrict,
  direction text not null,
  quantity integer not null,
  note text,
  member_id uuid references public.profiles (id),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint inventory_movements_direction_check
    check (direction in ('inbound', 'outbound')),
  constraint inventory_movements_quantity_check
    check (quantity > 0 and quantity <= 100000),
  constraint inventory_movements_note_len
    check (note is null or char_length(note) <= 500)
);

create index inventory_movements_item_created_idx
  on public.inventory_movements (item_id, created_at desc);

create index inventory_movements_created_idx
  on public.inventory_movements (created_at desc);

alter table public.inventory_movements enable row level security;

revoke all on public.inventory_movements from authenticated;
grant select, insert, delete on public.inventory_movements to authenticated;

create policy "staff read inventory movements"
  on public.inventory_movements
  for select
  to authenticated
  using (public.vanta_is_staff());

create policy "staff log inventory movements"
  on public.inventory_movements
  for insert
  to authenticated
  with check (
    public.vanta_is_staff()
    and created_by = auth.uid()
  );

-- Voiding a movement is an admin correction; members cannot erase history.
create policy "admins void inventory movements"
  on public.inventory_movements
  for delete
  to authenticated
  using (public.vanta_is_admin());

-- Stamp created_by from the JWT so a client cannot attribute a log to someone else.
create or replace function public.vanta_stamp_inventory_movement()
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

create trigger inventory_movements_stamp
  before insert on public.inventory_movements
  for each row execute function public.vanta_stamp_inventory_movement();

-- Refuse outbound that would drive on-hand below zero.
create or replace function public.vanta_guard_inventory_outbound()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  on_hand bigint;
begin
  if new.direction <> 'outbound' then
    return new;
  end if;

  select coalesce(sum(
    case when m.direction = 'inbound' then m.quantity else -m.quantity end
  ), 0)
    into on_hand
  from public.inventory_movements m
  where m.item_id = new.item_id;

  if on_hand < new.quantity then
    raise exception 'Not enough stock (have %, need %)', on_hand, new.quantity
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger inventory_movements_guard_outbound
  before insert on public.inventory_movements
  for each row execute function public.vanta_guard_inventory_outbound();

-- --- Stock view -------------------------------------------------------------

create or replace function public.vanta_inventory_balances()
returns table (
  item_id uuid,
  inbound_total bigint,
  outbound_total bigint,
  on_hand bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.item_id,
    coalesce(sum(case when m.direction = 'inbound' then m.quantity else 0 end), 0)::bigint,
    coalesce(sum(case when m.direction = 'outbound' then m.quantity else 0 end), 0)::bigint,
    coalesce(sum(
      case when m.direction = 'inbound' then m.quantity else -m.quantity end
    ), 0)::bigint
  from public.inventory_movements m
  group by m.item_id;
$$;

grant execute on function public.vanta_inventory_balances() to authenticated;

create view public.inventory_stock as
select
  i.id as item_id,
  i.name as item_name,
  i.is_active,
  i.created_at,
  coalesce(b.inbound_total, 0)::bigint as inbound_total,
  coalesce(b.outbound_total, 0)::bigint as outbound_total,
  coalesce(b.on_hand, 0)::bigint as on_hand
from public.inventory_items i
left join public.vanta_inventory_balances() b on b.item_id = i.id
where public.vanta_is_staff();

grant select on public.inventory_stock to authenticated;

-- --- Audit ------------------------------------------------------------------

create or replace function public.vanta_audit_inventory_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.vanta_audit(
      'inventory.item_create',
      'inventory_items',
      new.id,
      jsonb_build_object('name', new.name)
    );
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.vanta_audit(
      'inventory.item_delete',
      'inventory_items',
      old.id,
      jsonb_build_object('deleted', to_jsonb(old))
    );
    return null;
  end if;

  if new.name is distinct from old.name or new.is_active is distinct from old.is_active then
    perform public.vanta_audit(
      'inventory.item_edit',
      'inventory_items',
      new.id,
      jsonb_build_object(
        'name', jsonb_build_object('from', old.name, 'to', new.name),
        'is_active', jsonb_build_object('from', old.is_active, 'to', new.is_active)
      )
    );
  end if;

  return null;
end;
$$;

create trigger inventory_items_audit
  after insert or update or delete on public.inventory_items
  for each row execute function public.vanta_audit_inventory_item();

create or replace function public.vanta_audit_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_label text;
  member_label text;
begin
  if tg_op = 'DELETE' then
    select i.name into item_label from public.inventory_items i where i.id = old.item_id;
    perform public.vanta_audit(
      'inventory.void',
      'inventory_movements',
      old.id,
      jsonb_build_object(
        'deleted', to_jsonb(old),
        'item', item_label
      )
    );
    return null;
  end if;

  select i.name into item_label from public.inventory_items i where i.id = new.item_id;

  if new.member_id is not null then
    select coalesce(nullif(p.ingame_name, ''), p.discord_username, p.id::text)
      into member_label
    from public.profiles p
    where p.id = new.member_id;
  end if;

  perform public.vanta_audit(
    case when new.direction = 'inbound' then 'inventory.inbound' else 'inventory.outbound' end,
    'inventory_movements',
    new.id,
    jsonb_build_object(
      'item', item_label,
      'direction', new.direction,
      'quantity', new.quantity,
      'note', new.note,
      'member', member_label
    )
  );

  return null;
end;
$$;

create trigger inventory_movements_audit
  after insert or delete on public.inventory_movements
  for each row execute function public.vanta_audit_inventory_movement();

-- Seed a starter catalog from common crew materials. Admins can rename/retire.
insert into public.inventory_items (name) values
  ('Chopmats — Aluminum'),
  ('Chopmats — Copper'),
  ('Chopmats — Steel'),
  ('Chopmats — Metal Scrap'),
  ('Chopmats — Electronics'),
  ('Stolen Materials'),
  ('Recyclable Materials'),
  ('Tech Components'),
  ('Marked Bills'),
  ('Credit Slips')
on conflict (name) do nothing;
