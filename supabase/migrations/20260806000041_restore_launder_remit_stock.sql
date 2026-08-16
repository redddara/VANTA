-- Restore laundering remit → Contract - Launder stock.
-- Earlier cleanup removed auto-movements after a misunderstanding;
-- approved portal remits should credit this stash item again.

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

  if launder_item is null or launder_type is null then
    return;
  end if;

  update public.remit_types
  set inventory_item_id = launder_item
  where id = launder_type;

  perform set_config('vanta.syncing_remit_inventory', '1', true);

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
    launder_item,
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
  where l.remit_type_id = launder_type
    and l.status = 'approved'
    and not exists (
      select 1
      from public.inventory_movements m
      where m.remit_log_id = l.id
    );
end;
$$;
