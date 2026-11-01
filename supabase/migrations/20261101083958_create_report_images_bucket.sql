/*
# Create private report-images storage bucket

1. New bucket
- `report-images` is private (not public).
- Maximum file size is 10 MB (10485760 bytes).
- Only image/jpeg, image/png and image/webp files are accepted.

2. Security
- Storage policies on storage.objects let only signed-in (authenticated) users insert and read objects.
- Access is limited to objects whose first folder is the user's own auth id: {user_id}/{temporary_id}/{filename}.
- No update or delete policy is added, so users cannot overwrite or remove other files.

3. Notes
- Safe to re-run: the bucket is upserted and policies are dropped before being recreated.
- No image binary is stored in PostgreSQL tables.
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-images', 'report-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report_images_insert_own_folder" on storage.objects;
create policy "report_images_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "report_images_select_own_folder" on storage.objects;
create policy "report_images_select_own_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
