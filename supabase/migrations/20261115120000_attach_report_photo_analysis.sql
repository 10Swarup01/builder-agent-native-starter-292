/*
# Store Gemini photo analysis for waste reports

1. New tables
- `report_photo_analyses`: one row per Gemini analysis attempt on an uploaded photo. Successful rows hold the validated analysis JSON; failed rows hold only an error code.
- `report_ai_analyses`: the analysis of a report's original photo, copied from the latest successful attempt when the photo is linked to the report.

2. Security
- Row Level Security is enabled on both tables.
- Signed-in users can read and insert only their own attempt rows, and only for photos in their own storage folder. No update or delete.
- Signed-in users can read only the report analyses they own. Other users cannot read them, even though they can read the report rows.
- `report_ai_analyses` has no insert policy; only the trigger writes it, with the function owner's rights.
- `public.reports`, `public.report_images`, their policies and grants, and `submit_waste_report` are not changed.

3. Validation
- `is_valid_waste_analysis(jsonb)` rejects stored analyses whose required fields, allowed values or types are wrong.

4. Notes
- Additive and idempotent. No existing data is changed or removed.
*/

CREATE OR REPLACE FUNCTION public.is_valid_waste_analysis(a jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    jsonb_typeof(a) = 'object'
    AND a ?& ARRAY[
      'is_waste', 'image_quality', 'primary_category', 'detected_items', 'confidence',
      'severity', 'description', 'environmental_risks', 'disposal_recommendation',
      'requires_special_handling'
    ]
    AND jsonb_typeof(a->'is_waste') = 'boolean'
    AND jsonb_typeof(a->'requires_special_handling') = 'boolean'
    AND a->>'image_quality' IN ('clear', 'unclear', 'insufficient')
    AND a->>'primary_category' IN (
      'Plastic Waste', 'Household Waste', 'Medical Waste', 'Chemical Waste', 'Liquid Waste',
      'Electronic Waste', 'Glass Waste', 'Metal Waste', 'Organic/Biodegradable Waste',
      'Mixed Waste', 'Other/Unknown'
    )
    AND a->>'severity' IN ('Low', 'Medium', 'High', 'Critical')
    AND jsonb_typeof(a->'detected_items') = 'array'
    AND jsonb_typeof(a->'environmental_risks') = 'array'
    AND jsonb_typeof(a->'description') = 'string'
    AND jsonb_typeof(a->'disposal_recommendation') = 'string'
    AND CASE
      WHEN jsonb_typeof(a->'confidence') = 'number'
      THEN (a->>'confidence')::numeric BETWEEN 0 AND 100
           AND (a->>'confidence')::numeric = trunc((a->>'confidence')::numeric)
      ELSE false
    END,
    false
  )
$$;

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
    (status = 'succeeded' AND analysis IS NOT NULL AND public.is_valid_waste_analysis(analysis) AND error_code IS NULL)
    OR (status = 'failed' AND analysis IS NULL AND error_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS report_photo_analyses_user_created_idx
  ON public.report_photo_analyses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS report_photo_analyses_image_created_idx
  ON public.report_photo_analyses (image_path, created_at DESC);

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

CREATE TABLE IF NOT EXISTS public.report_ai_analyses (
  report_id uuid PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  model text NOT NULL,
  analysis jsonb NOT NULL CHECK (public.is_valid_waste_analysis(analysis)),
  analyzed_at timestamptz NOT NULL
);

ALTER TABLE public.report_ai_analyses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.report_ai_analyses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.report_ai_analyses TO authenticated;

DROP POLICY IF EXISTS "read_own_report_ai_analyses" ON public.report_ai_analyses;
CREATE POLICY "read_own_report_ai_analyses" ON public.report_ai_analyses
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

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

  INSERT INTO public.report_ai_analyses (report_id, user_id, image_path, model, analysis, analyzed_at)
  SELECT r.id, r.user_id, pa.image_path, pa.model, pa.analysis, pa.created_at
  FROM public.reports r
  JOIN public.report_photo_analyses pa
    ON pa.user_id = r.user_id
   AND pa.image_path = NEW.image_url
   AND pa.status = 'succeeded'
  WHERE r.id = NEW.report_id
  ORDER BY pa.created_at DESC
  LIMIT 1
  ON CONFLICT (report_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_report_photo_analysis() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS report_images_attach_photo_analysis ON public.report_images;
CREATE TRIGGER report_images_attach_photo_analysis
  AFTER INSERT ON public.report_images
  FOR EACH ROW EXECUTE FUNCTION public.attach_report_photo_analysis();
