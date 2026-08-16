-- Total inventory was reading 0 for some items while Warehouse tabs were
-- correct: security_invoker views aggregated movements under RLS oddly.
-- Go back to security-definer balance helpers for both Total and per-warehouse.

create or replace function public.vanta_inventory_item_balances()
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

grant execute on function public.vanta_inventory_item_balances() to authenticated;

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

drop view if exists public.inventory_warehouse_stock;
drop view if exists public.inventory_stock;

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
left join public.vanta_inventory_item_balances() b on b.item_id = i.id
where public.vanta_is_admin();

create view public.inventory_warehouse_stock as
select
  w.id as warehouse,
  w.name as warehouse_name,
  w.sort_order,
  w.is_active as warehouse_active,
  i.id as item_id,
  i.name as item_name,
  i.is_active,
  i.created_at,
  coalesce(b.inbound_total, 0)::bigint as inbound_total,
  coalesce(b.outbound_total, 0)::bigint as outbound_total,
  coalesce(b.on_hand, 0)::bigint as on_hand
from public.inventory_items i
cross join public.inventory_warehouses w
left join public.vanta_inventory_warehouse_balances() b
  on b.item_id = i.id and b.warehouse = w.id
where public.vanta_is_admin()
   or public.vanta_has_warehouse_access(w.id);

grant select on public.inventory_stock to authenticated;
grant select on public.inventory_warehouse_stock to authenticated;

notify pgrst, 'reload schema';
