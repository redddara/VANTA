-- Connect remits to inventory: each remit type may point at an inventory item.
-- Approving a remit auto-creates (or updates) an inbound movement; leaving
-- approved / voiding the remit removes that stock entry.

-- --- Link columns -----------------------------------------------------------

alter table public.remit_types
  add column if not exists inventory_item_id uuid
    references public.inventory_items (id) on delete set null;

create index if not exists remit_types_inventory_item_idx
  on public.remit_types (inventory_item_id)
  where inventory_item_id is not null;

alter table public.inventory_movements
  add column if not exists remit_log_id uuid
    references public.remit_logs (id) on delete cascade;

-- One remit contributes at most one stock movement. UNIQUE allows many NULLs.
alter table public.inventory_movements
  drop constraint if exists inventory_movements_remit_log_id_key;

alter table public.inventory_movements
  add constraint inventory_movements_remit_log_id_key unique (remit_log_id);

-- Match existing catalog rows by name (Laundering Contract has no stock item).
update public.remit_types t
set inventory_item_id = i.id
from public.inventory_items i
where i.name = t.name
  and t.inventory_item_id is null;

-- --- Guard: remit-linked stock is voided via the remit, not by hand ---------

create or replace function public.vanta_guard_remit_linked_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.remit_log_id is null then
    return old;
  end if;

  -- Sync trigger marks this so it can pull stock back on un-approve.
  if coalesce(current_setting('vanta.syncing_remit_inventory', true), '') = '1' then
    return old;
  end if;

  -- ON DELETE CASCADE from remit_logs: parent row is already gone.
  if not exists (
    select 1 from public.remit_logs r where r.id = old.remit_log_id
  ) then
    return old;
  end if;

  raise exception
    'This stock came from an approved remit. Un-approve or void the remit instead.'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists inventory_movements_guard_remit_link on public.inventory_movements;
create trigger inventory_movements_guard_remit_link
  before delete on public.inventory_movements
  for each row execute function public.vanta_guard_remit_linked_movement();

-- --- Sync approved remits into inbound stock --------------------------------

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

  -- Left approved (reject / back to pending): pull the inbound back out.
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

  -- Type does not feed inventory (e.g. Laundering Contract).
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
    remit_log_id
  )
  values (
    target_item,
    'inbound',
    new.quantity,
    note_text,
    new.member_id,
    actor,
    new.id
  )
  on conflict (remit_log_id)
  do update set
    item_id = excluded.item_id,
    quantity = excluded.quantity,
    note = excluded.note,
    member_id = excluded.member_id;

  return null;
end;
$$;

drop trigger if exists remit_logs_sync_inventory on public.remit_logs;
create trigger remit_logs_sync_inventory
  after update or delete on public.remit_logs
  for each row execute function public.vanta_sync_remit_to_inventory();
