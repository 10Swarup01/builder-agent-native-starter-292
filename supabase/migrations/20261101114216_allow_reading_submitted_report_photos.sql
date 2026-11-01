CREATE POLICY "report_images_select_submitted_photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-images'
    AND EXISTS (
      SELECT 1 FROM public.report_images ri
      WHERE ri.image_url = storage.objects.name
    )
  );