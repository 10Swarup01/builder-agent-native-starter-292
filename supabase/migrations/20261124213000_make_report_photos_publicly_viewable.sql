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

-- 2. Allow public and authenticated users to read submitted report photos in storage
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

-- 3. Ensure public and anonymous visitors can read reports, waste categories, and report photo metadata
GRANT SELECT ON public.waste_categories, public.reports, public.report_images, public.report_status_history TO anon, authenticated;

DROP POLICY IF EXISTS "read_waste_categories" ON public.waste_categories;
CREATE POLICY "read_waste_categories" ON public.waste_categories
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "read_reports" ON public.reports;
CREATE POLICY "read_reports" ON public.reports
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "read_report_images" ON public.report_images;
CREATE POLICY "read_report_images" ON public.report_images
  FOR SELECT TO anon, authenticated
  USING (true);

