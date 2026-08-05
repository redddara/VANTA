-- Every remit type feeds inventory on approval. Add missing stash items
-- (including Laundering Contract) and link any still-unlinked remit types.

insert into public.inventory_items (name)
select t.name
from public.remit_types t
where not exists (
  select 1 from public.inventory_items i where i.name = t.name
)
on conflict (name) do nothing;

update public.remit_types t
set inventory_item_id = i.id
from public.inventory_items i
where i.name = t.name
  and t.inventory_item_id is null;
