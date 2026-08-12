-- Split stash stock across Warehouse 1 / 2 / 3. Existing movements land in
-- Warehouse 1. Approved remits continue to credit Warehouse 1.
-- inventory_stock stays the crew-wide total; inventory_warehouse_stock is per site.

alter table public.inventory_movements
  add column if not exists warehouse smallint not null default 1;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_warehouse_check;

alter table public.inventory_movements
  add constraint inventory_movements_warehouse_check
    check (warehouse in (1, 2, 3));

create index if not exists inventory_movements_warehouse_item_idx
  on public.inventory_movements (warehouse, item_id);

-- Outbound cannot overdraw the chosen warehouse.
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
  where m.item_id = new.item_id
    and m.warehouse = new.warehouse;

  if on_hand < new.quantity then
    raise exception
      'Not enough stock in Warehouse % (have %, need %)',
      new.warehouse, on_hand, new.quantity
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Totals across every warehouse (same shape the app already uses).
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

create or replace function public.vanta_inventory_warehouse_balances()
returns table (
  warehouse smallint,
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
    m.warehouse,
    m.item_id,
    coalesce(sum(case when m.direction = 'inbound' then m.quantity else 0 end), 0)::bigint,
    coalesce(sum(case when m.direction = 'outbound' then m.quantity else 0 end), 0)::bigint,
    coalesce(sum(
      case when m.direction = 'inbound' then m.quantity else -m.quantity end
    ), 0)::bigint
  from public.inventory_movements m
  group by m.warehouse, m.item_id;
$$;

grant execute on function public.vanta_inventory_warehouse_balances() to authenticated;

drop view if exists public.inventory_stock;
drop view if exists public.inventory_warehouse_stock;

create view public.inventory_stock as
select
  i.id as item_id,
  i.name as item_name,
  i.is_active,
  i.created_at,
  coalesce(b.inbound_total, 0)::bigint as inbound_total,
  coalesce(b.outbound_total, 0)::bigint as outbound_total,
  coalesce(b.on_hand, 0)::bigint as on_hand,
  coalesce(w1.on_hand, 0)::bigint as warehouse_1,
  coalesce(w2.on_hand, 0)::bigint as warehouse_2,
  coalesce(w3.on_hand, 0)::bigint as warehouse_3
from public.inventory_items i
left join public.vanta_inventory_balances() b on b.item_id = i.id
left join public.vanta_inventory_warehouse_balances() w1
  on w1.item_id = i.id and w1.warehouse = 1
left join public.vanta_inventory_warehouse_balances() w2
  on w2.item_id = i.id and w2.warehouse = 2
left join public.vanta_inventory_warehouse_balances() w3
  on w3.item_id = i.id and w3.warehouse = 3
where public.vanta_is_staff();

grant select on public.inventory_stock to authenticated;

create view public.inventory_warehouse_stock as
select
  w.warehouse,
  i.id as item_id,
  i.name as item_name,
  i.is_active,
  i.created_at,
  coalesce(b.inbound_total, 0)::bigint as inbound_total,
  coalesce(b.outbound_total, 0)::bigint as outbound_total,
  coalesce(b.on_hand, 0)::bigint as on_hand
from public.inventory_items i
cross join (values (1::smallint), (2::smallint), (3::smallint)) as w(warehouse)
left join public.vanta_inventory_warehouse_balances() b
  on b.item_id = i.id and b.warehouse = w.warehouse
where public.vanta_is_staff();

grant select on public.inventory_warehouse_stock to authenticated;

-- Remit approvals land in Warehouse 1.
create or replace function public.vanta_sync_remit_to_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_item uuid;
  note_text text;
  actor uuid;
begin
  perform set_config('vanta.syncing_remit_inventory', '1', true);

  if tg_op = 'DELETE' then
    delete from public.inventory_movements where remit_log_id = old.id;
    return null;
  end if;

  if old.status = 'approved' and new.status is distinct from 'approved' then
    delete from public.inventory_movements where remit_log_id = new.id;
  end if;

  if new.status <> 'approved' then
    return null;
  end if;

  select t.inventory_item_id
    into target_item
  from public.remit_types t
  where t.id = new.remit_type_id;

  if target_item is null then
    delete from public.inventory_movements where remit_log_id = new.id;
    return null;
  end if;

  note_text := left(
    coalesce(
      nullif(trim(new.description), ''),
      'From approved remit'
    ),
    500
  );
  actor := coalesce(auth.uid(), new.reviewed_by, new.submitted_by);

  insert into public.inventory_movements (
    item_id,
    direction,
    quantity,
    note,
    member_id,
    created_by,
    remit_log_id,
    warehouse
  )
  values (
    target_item,
    'inbound',
    new.quantity,
    note_text,
    new.member_id,
    actor,
    new.id,
    1
  )
  on conflict (remit_log_id)
  do update set
    item_id = excluded.item_id,
    quantity = excluded.quantity,
    note = excluded.note,
    member_id = excluded.member_id,
    warehouse = 1;

  return null;
end;
$$;

-- Audit movements include warehouse.
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
      'warehouse', new.warehouse,
      'note', new.note,
      'member', member_label
    )
  );

  return null;
end;
$$;
