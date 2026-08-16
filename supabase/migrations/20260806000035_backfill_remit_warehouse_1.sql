-- Link every remit type to a stash item, then backfill Warehouse 1 inbound
-- for approved remits that never got a movement.
--
-- Also harden the movement stamp so auth.uid() does not wipe an explicit
-- created_by (needed for backfills and security-definer remit sync).

create or replace function public.vanta_stamp_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

insert into public.inventory_items (name)
select t.name
from public.remit_types t
where t.inventory_item_id is null
  and not exists (
    select 1 from public.inventory_items i where i.name = t.name
  )
on conflict (name) do nothing;

update public.remit_types t
set inventory_item_id = i.id
from public.inventory_items i
where i.name = t.name
  and t.inventory_item_id is null;

update public.inventory_movements m
set warehouse = 1
where m.remit_log_id is not null
  and m.warehouse is distinct from 1;

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
select
  t.inventory_item_id,
  'inbound',
  l.quantity,
  left(
    coalesce(nullif(trim(l.description), ''), 'From approved remit'),
    500
  ),
  l.member_id,
  coalesce(l.reviewed_by, l.submitted_by, l.member_id),
  l.id,
  1
from public.remit_logs l
join public.remit_types t on t.id = l.remit_type_id
where l.status = 'approved'
  and t.inventory_item_id is not null
  and coalesce(l.reviewed_by, l.submitted_by, l.member_id) is not null
  and not exists (
    select 1
    from public.inventory_movements m
    where m.remit_log_id = l.id
  );
