-- Crew strategies handbook: categorized playbooks with optional reference videos.
-- Readable by every signed-in member. Managed by Underboss+ only.

-- --- Categories -------------------------------------------------------------

create table public.strategy_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint strategy_categories_name_unique unique (name),
  constraint strategy_categories_name_len check (char_length(name) between 1 and 80)
);

create index strategy_categories_sort_idx
  on public.strategy_categories (sort_order, name);

alter table public.strategy_categories enable row level security;

revoke all on public.strategy_categories from authenticated;
grant select on public.strategy_categories to authenticated;
grant insert, update, delete on public.strategy_categories to authenticated;

create policy "members read strategy categories"
  on public.strategy_categories
  for select
  to authenticated
  using (true);

create policy "admins manage strategy categories"
  on public.strategy_categories
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

insert into public.strategy_categories (name, sort_order) values
  ('Block Strategy', 10),
  ('Chase Switch', 20),
  ('General', 30);

-- --- Strategies -------------------------------------------------------------

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.strategy_categories (id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategies_title_len check (char_length(title) between 1 and 120),
  constraint strategies_description_len
    check (description is null or char_length(description) <= 4000),
  constraint strategies_video_url_len
    check (video_url is null or char_length(video_url) <= 500)
);

create index strategies_category_title_idx
  on public.strategies (category_id, title);

create index strategies_created_idx
  on public.strategies (created_at desc);

alter table public.strategies enable row level security;

revoke all on public.strategies from authenticated;
grant select on public.strategies to authenticated;
grant insert, update, delete on public.strategies to authenticated;

create policy "members read strategies"
  on public.strategies
  for select
  to authenticated
  using (true);

create policy "admins insert strategies"
  on public.strategies
  for insert
  to authenticated
  with check (
    public.vanta_is_admin()
    and created_by = auth.uid()
  );

create policy "admins update strategies"
  on public.strategies
  for update
  to authenticated
  using (public.vanta_is_admin())
  with check (
    public.vanta_is_admin()
    and updated_by = auth.uid()
  );

create policy "admins delete strategies"
  on public.strategies
  for delete
  to authenticated
  using (public.vanta_is_admin());

-- Stamp authorship from the JWT; clients cannot attribute edits to someone else.
create or replace function public.vanta_stamp_strategy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger strategies_stamp
  before insert or update on public.strategies
  for each row execute function public.vanta_stamp_strategy();

-- --- Audit ------------------------------------------------------------------

create or replace function public.vanta_audit_strategy_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    perform public.vanta_audit(
      'strategy.category_delete',
      'strategy_categories',
      old.id,
      jsonb_build_object('deleted', to_jsonb(old))
    );
    return null;
  end if;

  if tg_op = 'INSERT' then
    perform public.vanta_audit(
      'strategy.category_create',
      'strategy_categories',
      new.id,
      jsonb_build_object('name', new.name, 'sort_order', new.sort_order)
    );
    return null;
  end if;

  if new.name is distinct from old.name then
    diff := diff || jsonb_build_object(
      'name', jsonb_build_object('from', old.name, 'to', new.name)
    );
  end if;
  if new.sort_order is distinct from old.sort_order then
    diff := diff || jsonb_build_object(
      'sort_order', jsonb_build_object('from', old.sort_order, 'to', new.sort_order)
    );
  end if;

  if diff <> '{}'::jsonb then
    perform public.vanta_audit(
      'strategy.category_edit',
      'strategy_categories',
      new.id,
      diff
    );
  end if;
  return null;
end;
$$;

create trigger strategy_categories_audit
  after insert or update or delete on public.strategy_categories
  for each row execute function public.vanta_audit_strategy_category();

create or replace function public.vanta_audit_strategy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
  category_label text;
begin
  if tg_op = 'DELETE' then
    select c.name into category_label
    from public.strategy_categories c
    where c.id = old.category_id;

    perform public.vanta_audit(
      'strategy.delete',
      'strategies',
      old.id,
      jsonb_build_object(
        'deleted', to_jsonb(old),
        'category', category_label
      )
    );
    return null;
  end if;

  select c.name into category_label
  from public.strategy_categories c
  where c.id = new.category_id;

  if tg_op = 'INSERT' then
    perform public.vanta_audit(
      'strategy.create',
      'strategies',
      new.id,
      jsonb_build_object(
        'title', new.title,
        'category', category_label,
        'video_url', new.video_url
      )
    );
    return null;
  end if;

  if new.category_id is distinct from old.category_id then
    diff := diff || jsonb_build_object(
      'category_id', jsonb_build_object('from', old.category_id, 'to', new.category_id)
    );
  end if;
  if new.title is distinct from old.title then
    diff := diff || jsonb_build_object(
      'title', jsonb_build_object('from', old.title, 'to', new.title)
    );
  end if;
  if new.description is distinct from old.description then
    diff := diff || jsonb_build_object(
      'description', jsonb_build_object('from', old.description, 'to', new.description)
    );
  end if;
  if new.video_url is distinct from old.video_url then
    diff := diff || jsonb_build_object(
      'video_url', jsonb_build_object('from', old.video_url, 'to', new.video_url)
    );
  end if;

  if diff <> '{}'::jsonb then
    perform public.vanta_audit(
      'strategy.edit',
      'strategies',
      new.id,
      diff || jsonb_build_object('category', category_label)
    );
  end if;
  return null;
end;
$$;

create trigger strategies_audit
  after insert or update or delete on public.strategies
  for each row execute function public.vanta_audit_strategy();
