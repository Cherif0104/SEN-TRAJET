-- Bucket pour les documents chauffeur (permis, carte grise, assurance, photo identité)
-- Lecture publique pour que les URLs retournées par getPublicUrl soient accessibles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Politique : tout le monde peut lire (bucket public)
drop policy if exists "documents_public_read" on storage.objects;
create policy "documents_public_read"
on storage.objects for select
using (bucket_id = 'documents');

-- Politique : un utilisateur authentifié peut insérer uniquement dans son dossier {driver_id}/...
drop policy if exists "documents_authenticated_insert_own" on storage.objects;
create policy "documents_authenticated_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documents_authenticated_update_own" on storage.objects;
create policy "documents_authenticated_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "documents_authenticated_delete_own" on storage.objects;
create policy "documents_authenticated_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
