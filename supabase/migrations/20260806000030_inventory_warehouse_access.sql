-- Per-member warehouse assignments. Underboss+ see every warehouse and Total;
-- everyone else only sees/logs warehouses they are assigned to.

create table public.inventory_warehouse_access (
  member_id uuid not null references public.profiles (id) on delete cascade,
  warehouse smallint not null,
  created_at timestamptz not null default now(),
  constraint inventory_warehouse_access_warehouse_check
    check (warehouse in (1, 2, 3)),
  primary key (member_id, warehouse)
);

create index inventory_warehouse_access_warehouse_idx
  on public.inventory_warehouse_access (warehouse);

alter table public.inventory_warehouse_access enable row level security;

revoke all on public.inventory_warehouse_access from authenticated;
grant select, insert, delete on public.inventory_warehouse_access to authenticated;

create policy "read own or admin warehouse access"
  on public.inventory_warehouse_access
  for select
  to authenticated
  using (member_id = auth.uid() or public.vanta_is_admin());

create policy "admins manage warehouse access"
  on public.inventory_warehouse_access
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

create or replace function public.vanta_has_warehouse_access(p_warehouse smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_is_admin()
    or exists (
      select 1
      from public.inventory_warehouse_access a
      where a.member_id = auth.uid()
        and a.warehouse = p_warehouse
    );
$$;

create or replace function public.vanta_can_access_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.vanta_is_admin()
    or exists (
      select 1
      from public.inventory_warehouse_access a
      where a.member_id = auth.uid()
    );
$$;

grant execute on function public.vanta_has_warehouse_access(smallint) to authenticated;
grant execute on function public.vanta_can_access_inventory() to authenticated;

-- Items: anyone with inventory access may read the catalog; admins still manage.
drop policy if exists "staff read inventory items" on public.inventory_items;
create policy "inventory readers see items"
  on public.inventory_items
  for select
  to authenticated
  using (public.vanta_can_access_inventory());

drop policy if exists "staff read inventory movements" on public.inventory_movements;
create policy "warehouse access read movements"
  on public.inventory_movements
  for select
  to authenticated
  using (
    public.vanta_is_admin()
    or public.vanta_has_warehouse_access(warehouse)
  );

drop policy if exists "staff log inventory movements" on public.inventory_movements;
create policy "warehouse access log movements"
  on public.inventory_movements
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.vanta_is_admin()
      or public.vanta_has_warehouse_access(warehouse)
    )
  );

drop view if exists public.inventory_stock;
drop view if exists public.inventory_warehouse_stock;

-- Total rollup: admins only.
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
where public.vanta_is_admin();

grant select on public.inventory_stock to authenticated;

-- Per-warehouse stock: admin or assigned to that warehouse.
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
where public.vanta_is_admin()
   or public.vanta_has_warehouse_access(w.warehouse);

grant select on public.inventory_warehouse_stock to authenticated;
