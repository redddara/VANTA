-- Screenshot / image proof on reimbursement logs (paste, drop, or file).

alter table public.reimbursement_logs
  add column if not exists proof_path text;

comment on column public.reimbursement_logs.proof_path is
  'Object path inside the reimbursement-proofs storage bucket (uploader uid / file).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reimbursement-proofs',
  'reimbursement-proofs',
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
create policy "members upload own reimbursement proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'reimbursement-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "members update own reimbursement proofs"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'reimbursement-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'reimbursement-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "members delete own reimbursement proofs"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'reimbursement-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Logger or staff can view proof.
create policy "crew read reimbursement proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'reimbursement-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.vanta_is_staff()
      or exists (
        select 1
        from public.reimbursement_logs r
        where r.proof_path = name
          and r.logged_by = auth.uid()
      )
    )
  );
