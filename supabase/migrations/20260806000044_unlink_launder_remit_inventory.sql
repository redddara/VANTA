-- Contract - Launder is counted from warehouse movements only.
-- Approved "Contract - Laundering" remits stay on the Remit Tracker and must
-- not inflate inventory In/Out (target: Warehouse 1 → 19 in / 19 out / 0 on hand).

do $$
declare
  launder_item uuid;
  launder_type uuid;
begin
  select id into launder_item
  from public.inventory_items
  where name = 'Contract - Launder';

  select id into launder_type
  from public.remit_types
  where name = 'Contract - Laundering';

  if launder_item is not null then
    perform set_config('vanta.syncing_remit_inventory', '1', true);

    delete from public.inventory_movements
    where item_id = launder_item
      and remit_log_id is not null;
  end if;

  if launder_type is not null then
    update public.remit_types
    set inventory_item_id = null
    where id = launder_type;
  end if;
end;
$$;
