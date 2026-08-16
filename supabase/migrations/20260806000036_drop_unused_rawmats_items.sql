-- Drop unused Rawmats catalog rows created as empty placeholders.
-- Safe: no movements and no remit_types point at them.

delete from public.inventory_items i
where i.name in (
  'Rawmats - Glass',
  'Rawmats - Plastic',
  'Rawmats - Rubber',
  'Rawmats — Aluminum',
  'Rawmats — Copper',
  'Rawmats — Electronics',
  'Rawmats — Metal Scrap',
  'Rawmats — Steel'
)
and not exists (
  select 1 from public.inventory_movements m where m.item_id = i.id
)
and not exists (
  select 1 from public.remit_types t where t.inventory_item_id = i.id
);
