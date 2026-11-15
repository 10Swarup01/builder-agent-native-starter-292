/*
# Store Gemini photo analysis for waste reports

1. New table
- `report_photo_analyses`: one row per Gemini analysis attempt on an uploaded photo. Successful rows hold the validated analysis JSON; failed rows hold only an error code.

2. Reports
- `reports.ai_analysis` (jsonb, nullable) holds the latest successful analysis of the report's original photo. A trigger fills it when the photo is linked to the report, so the browser never sends classification data.

3. Security
- Row Level Security is enabled. Signed-in users can read and insert only their own rows, and only for photos stored in their own folder. No update or delete.
- The trigger runs with the function owner's rights so it can set `reports.ai_analysis` without granting UPDATE on `reports`.

4. Notes
- Additive and idempotent. `submit_waste_report` and its arguments are unchanged.
*/

CREATE TABLE IF NOT EXISTS public.report_photo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  model text NOT NULL,
  status text NOT NULL CHECK (status IN ('succeeded', 'failed')),
  analysis jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'succeeded' AND analysis IS NOT NULL)
    OR (status = 'failed' AND analysis IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS report_photo_analyses_user_created_idx
  ON public.report_photo_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS report_photo_analyses_image_created_idx
  ON public.report_photo_analyses (image_path, created_at DESC);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS ai_analysis jsonb;

ALTER TABLE public.report_photo_analyses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.report_photo_analyses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.report_photo_analyses TO authenticated;

DROP POLICY IF EXISTS "read_own_photo_analyses" ON public.report_photo_analyses;
CREATE POLICY "read_own_photo_analyses" ON public.report_photo_analyses
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "insert_own_photo_analyses" ON public.report_photo_analyses;
CREATE POLICY "insert_own_photo_analyses" ON public.report_photo_analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (storage.foldername(image_path))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'report-images' AND o.name = image_path
    )
  );

CREATE OR REPLACE FUNCTION public.attach_report_photo_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.image_type IS DISTINCT FROM 'original' THEN
    RETURN NEW;
  END IF;

  UPDATE public.reports r
  SET ai_analysis = (
    SELECT pa.analysis
    FROM public.report_photo_analyses pa
    WHERE pa.image_path = NEW.image_url
      AND pa.user_id = r.user_id
      AND pa.status = 'succeeded'
    ORDER BY pa.created_at DESC
    LIMIT 1
  )
  WHERE r.id = NEW.report_id;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_report_photo_analysis() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS report_images_attach_photo_analysis ON public.report_images;
CREATE TRIGGER report_images_attach_photo_analysis
  AFTER INSERT ON public.report_images
  FOR EACH ROW EXECUTE FUNCTION public.attach_report_photo_analysis();
