-- Screenshot / image proof attached when logging a remit.

alter table public.remit_logs
  add column if not exists proof_path text;

comment on column public.remit_logs.proof_path is
  'Object path inside the remit-proofs storage bucket (uploader uid / file).';

-- Private bucket: clients read via signed URLs after RLS allows select.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'remit-proofs',
  'remit-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths look like: {auth.uid()}/{uuid}.png
create policy "members upload own remit proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'remit-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "members update own remit proofs"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'remit-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'remit-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "members delete own remit proofs"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'remit-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Uploader, credited member, or staff (Enforcer+) can view proof.
create policy "crew read remit proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'remit-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.vanta_is_staff()
      or exists (
        select 1
        from public.remit_logs r
        where r.proof_path = name
          and (
            r.member_id = auth.uid()
            or r.submitted_by = auth.uid()
          )
      )
    )
  );
