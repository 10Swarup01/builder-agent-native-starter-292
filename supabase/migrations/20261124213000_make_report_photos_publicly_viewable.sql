/*
# Make submitted report photos viewable on public feeds and previews

1. Storage Bucket
- Sets `public = true` on the `report-images` bucket so image URLs can load reliably on public feeds, map previews, and detail cards.

2. Access Policies
- Allows both authenticated and anonymous users to view photos that are associated with submitted reports in `report_images`.
- Image uploads remain strictly restricted to authenticated users writing into their own auth folder: {user_id}/{temp_id}/{filename}.
*/

-- 1. Ensure report-images bucket is public for fast CDN image viewing
UPDATE storage.buckets
SET public = true
WHERE id = 'report-images';

-- 2. Allow public and authenticated users to read submitted report photos
DROP POLICY IF EXISTS "report_images_select_submitted_photos" ON storage.objects;

CREATE POLICY "report_images_select_submitted_photos" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'report-images'
    AND EXISTS (
      SELECT 1 FROM public.report_images ri
      WHERE ri.image_url = storage.objects.name
    )
  );
