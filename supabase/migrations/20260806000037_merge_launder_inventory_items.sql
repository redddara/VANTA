-- Merge duplicate launder stash items into one.
-- Keep "Contract - Launder" (manual stock history) and fold in
-- "Contract - Laundering" (remit-linked backfill), then drop the duplicate.

do $$
declare
  keep_id uuid;
  drop_id uuid;
begin
  select id into keep_id
  from public.inventory_items
  where name = 'Contract - Launder';

  select id into drop_id
  from public.inventory_items
  where name = 'Contract - Laundering';

  if keep_id is null or drop_id is null then
    return;
  end if;

  update public.inventory_movements
  set item_id = keep_id
  where item_id = drop_id;

  update public.remit_types
  set inventory_item_id = keep_id
  where inventory_item_id = drop_id;

  delete from public.inventory_items
  where id = drop_id;
end;
$$;
