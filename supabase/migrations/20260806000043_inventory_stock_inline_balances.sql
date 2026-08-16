-- Stock views that left-join set-returning balance functions can under-count
-- through PostgREST (manual 19/19 while remit inbounds exist). Inline the
-- aggregates inside security-definer row functions instead.

create or replace function public.vanta_inventory_stock_rows()
returns table (
  item_id uuid,
  item_name text,
  is_active boolean,
  created_at timestamptz,
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
    i.id,
    i.name,
    i.is_active,
    i.created_at,
    coalesce(b.inbound_total, 0)::bigint,
    coalesce(b.outbound_total, 0)::bigint,
    coalesce(b.on_hand, 0)::bigint
  from public.inventory_items i
  left join (
    select
      m.item_id,
      coalesce(sum(case when m.direction = 'inbound' then m.quantity else 0 end), 0)::bigint
        as inbound_total,
      coalesce(sum(case when m.direction = 'outbound' then m.quantity else 0 end), 0)::bigint
        as outbound_total,
      coalesce(sum(
        case when m.direction = 'inbound' then m.quantity else -m.quantity end
      ), 0)::bigint as on_hand
    from public.inventory_movements m
    group by m.item_id
  ) b on b.item_id = i.id
  where public.vanta_is_admin();
$$;

create or replace function public.vanta_inventory_warehouse_stock_rows()
returns table (
  warehouse smallint,
  warehouse_name text,
  sort_order integer,
  warehouse_active boolean,
  item_id uuid,
  item_name text,
  is_active boolean,
  created_at timestamptz,
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
    w.id,
    w.name,
    w.sort_order,
    w.is_active,
    i.id,
    i.name,
    i.is_active,
    i.created_at,
    coalesce(b.inbound_total, 0)::bigint,
    coalesce(b.outbound_total, 0)::bigint,
    coalesce(b.on_hand, 0)::bigint
  from public.inventory_items i
  cross join public.inventory_warehouses w
  left join (
    select
      m.warehouse,
      m.item_id,
      coalesce(sum(case when m.direction = 'inbound' then m.quantity else 0 end), 0)::bigint
        as inbound_total,
      coalesce(sum(case when m.direction = 'outbound' then m.quantity else 0 end), 0)::bigint
        as outbound_total,
      coalesce(sum(
        case when m.direction = 'inbound' then m.quantity else -m.quantity end
      ), 0)::bigint as on_hand
    from public.inventory_movements m
    group by m.warehouse, m.item_id
  ) b on b.item_id = i.id and b.warehouse = w.id
  where public.vanta_is_admin()
     or public.vanta_has_warehouse_access(w.id);
$$;

grant execute on function public.vanta_inventory_stock_rows() to authenticated;
grant execute on function public.vanta_inventory_warehouse_stock_rows() to authenticated;

drop view if exists public.inventory_warehouse_stock;
drop view if exists public.inventory_stock;

create view public.inventory_stock as
select * from public.vanta_inventory_stock_rows();

create view public.inventory_warehouse_stock as
select * from public.vanta_inventory_warehouse_stock_rows();

grant select on public.inventory_stock to authenticated;
grant select on public.inventory_warehouse_stock to authenticated;

notify pgrst, 'reload schema';
