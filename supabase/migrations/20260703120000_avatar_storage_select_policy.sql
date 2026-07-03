-- Upsert and authenticated reads require a SELECT policy on storage.objects.
create policy "avatar_read_authenticated_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public bucket: allow anyone to read avatar images via storage API / public URLs.
create policy "avatar_read_public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');
