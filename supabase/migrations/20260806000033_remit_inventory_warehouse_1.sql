-- Approved remits always credit Warehouse 1 (id = 1), not whichever
-- warehouse happens to sort first.

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
  target_warehouse smallint := 1;
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

  if not exists (
    select 1
    from public.inventory_warehouses w
    where w.id = target_warehouse
  ) then
    raise exception 'Warehouse 1 is missing; cannot receive remit stock'
      using errcode = 'P0001';
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
    target_warehouse
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
