-- One-time site update popups. Underboss+ posts them; each member dismisses
-- once and does not see that announcement again.

create table public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'everyone',
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint site_announcements_title_len
    check (char_length(title) between 1 and 120),
  constraint site_announcements_body_len
    check (char_length(body) between 1 and 2000),
  constraint site_announcements_audience_check
    check (audience in ('everyone', 'staff', 'admin'))
);

create index site_announcements_active_created_idx
  on public.site_announcements (is_active, created_at desc);

create table public.site_announcement_dismissals (
  announcement_id uuid not null
    references public.site_announcements (id) on delete cascade,
  member_id uuid not null
    references public.profiles (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (announcement_id, member_id)
);

create index site_announcement_dismissals_member_idx
  on public.site_announcement_dismissals (member_id);

alter table public.site_announcements enable row level security;
alter table public.site_announcement_dismissals enable row level security;

revoke all on public.site_announcements from authenticated;
revoke all on public.site_announcement_dismissals from authenticated;
grant select on public.site_announcements to authenticated;
grant insert, update, delete on public.site_announcements to authenticated;
grant select, insert on public.site_announcement_dismissals to authenticated;

create or replace function public.vanta_announcement_visible(p_audience text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_audience
    when 'everyone' then true
    when 'staff' then public.vanta_is_staff()
    when 'admin' then public.vanta_is_admin()
    else false
  end;
$$;

grant execute on function public.vanta_announcement_visible(text) to authenticated;

-- Active announcements the caller may see (audience-matched).
create policy "read visible announcements"
  on public.site_announcements
  for select
  to authenticated
  using (
    public.vanta_is_admin()
    or (
      is_active
      and public.vanta_announcement_visible(audience)
    )
  );

create policy "admins manage announcements"
  on public.site_announcements
  for all
  to authenticated
  using (public.vanta_is_admin())
  with check (public.vanta_is_admin());

-- Members can see their own dismissals; admins can see all for support.
create policy "read own announcement dismissals"
  on public.site_announcement_dismissals
  for select
  to authenticated
  using (member_id = auth.uid() or public.vanta_is_admin());

create policy "members dismiss announcements once"
  on public.site_announcement_dismissals
  for insert
  to authenticated
  with check (
    member_id = auth.uid()
    and exists (
      select 1
      from public.site_announcements a
      where a.id = announcement_id
        and a.is_active
        and public.vanta_announcement_visible(a.audience)
    )
  );

-- Pending popup for the current user (newest first).
create or replace function public.vanta_pending_announcements()
returns table (
  id uuid,
  title text,
  body text,
  audience text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.body,
    a.audience,
    a.created_at
  from public.site_announcements a
  where a.is_active
    and public.vanta_announcement_visible(a.audience)
    and not exists (
      select 1
      from public.site_announcement_dismissals d
      where d.announcement_id = a.id
        and d.member_id = auth.uid()
    )
  order by a.created_at desc;
$$;

grant execute on function public.vanta_pending_announcements() to authenticated;

create or replace function public.vanta_stamp_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger site_announcements_stamp
  before insert on public.site_announcements
  for each row execute function public.vanta_stamp_announcement();

create or replace function public.vanta_audit_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.vanta_audit(
      'announcement.create',
      'site_announcements',
      new.id,
      jsonb_build_object(
        'title', new.title,
        'audience', new.audience,
        'is_active', new.is_active
      )
    );
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.vanta_audit(
      'announcement.delete',
      'site_announcements',
      old.id,
      jsonb_build_object('title', old.title, 'audience', old.audience)
    );
    return null;
  end if;

  perform public.vanta_audit(
    'announcement.edit',
    'site_announcements',
    new.id,
    public.vanta_jsonb_diff(to_jsonb(old), to_jsonb(new))
  );
  return null;
end;
$$;

create trigger site_announcements_audit
  after insert or update or delete on public.site_announcements
  for each row execute function public.vanta_audit_announcement();
