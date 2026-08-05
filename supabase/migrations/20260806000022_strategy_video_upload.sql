-- Strategy reference videos are uploaded files, not external URLs.

alter table public.strategies
  add column if not exists video_path text;

comment on column public.strategies.video_path is
  'Object path inside the strategy-videos storage bucket.';

-- Private bucket; crew reads via signed URLs after RLS allows select.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'strategy-videos',
  'strategy-videos',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths: {auth.uid()}/{uuid}.mp4 — only admins upload/replace/remove.
create policy "admins upload strategy videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'strategy-videos'
    and public.vanta_is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "admins update strategy videos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'strategy-videos'
    and public.vanta_is_admin()
  )
  with check (
    bucket_id = 'strategy-videos'
    and public.vanta_is_admin()
  );

create policy "admins delete strategy videos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'strategy-videos'
    and public.vanta_is_admin()
  );

-- Every signed-in member can watch strategy videos.
create policy "members read strategy videos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'strategy-videos');
