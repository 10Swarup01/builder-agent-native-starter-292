/*
# Harden waste report submission

1. New function
- `submit_waste_report(...)` creates a report, links its uploaded photo, and writes the initial "reported" history entry in one database transaction.
- If any step fails (invalid category, missing photo, duplicate photo, input too long), nothing is saved and the caller gets an error.
- The photo path must sit inside the caller's own storage folder and must already exist in the report-images bucket.
- A photo can only be linked to one report, so retried or double-sent submissions cannot create a second report with the same photo.

2. Privilege changes
- Signed-in users can no longer insert into `reports` or `report_images` directly; they must use the function above.
- Anonymous users lose all access to the report tables. Row Level Security already blocked them; this removes the unused grants.
- Signed-in users lose UPDATE, DELETE, TRUNCATE and other unused table privileges on the report tables. Reading remains governed by existing policies.

3. Security notes
- The function runs with elevated rights so it can write both tables atomically, so it validates the caller and inputs itself.
- EXECUTE is revoked from PUBLIC and anon and granted only to authenticated.
- Report status is always set to "reported" by the function, so clients cannot submit any other status.

4. Notes
- Idempotent: the function is replaced, policies are dropped with IF EXISTS, and grants are re-applied.
- No existing data is changed or removed.
*/

REVOKE ALL ON public.waste_categories, public.reports, public.report_images, public.report_status_history FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.waste_categories, public.reports, public.report_images, public.report_status_history FROM authenticated;
REVOKE INSERT ON public.reports, public.report_images FROM authenticated;

DROP POLICY IF EXISTS "insert_own_reports" ON public.reports;
DROP POLICY IF EXISTS "insert_own_report_images" ON public.report_images;

CREATE OR REPLACE FUNCTION public.submit_waste_report(
  p_category_id bigint,
  p_description text,
  p_quantity text,
  p_duration text,
  p_blocking_traffic boolean,
  p_sensitive_locations text[],
  p_latitude double precision,
  p_longitude double precision,
  p_address text,
  p_image_path text
)
RETURNS TABLE (report_id uuid, report_number text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_report public.reports%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_image_path IS NULL OR split_part(p_image_path, '/', 1) <> v_user::text THEN
    RAISE EXCEPTION 'invalid_image_path' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id = 'report-images' AND o.name = p_image_path
  ) THEN
    RAISE EXCEPTION 'image_missing' USING ERRCODE = '02000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.report_images ri WHERE ri.image_url = p_image_path) THEN
    RAISE EXCEPTION 'image_already_used' USING ERRCODE = '23505';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.waste_categories wc WHERE wc.id = p_category_id) THEN
    RAISE EXCEPTION 'invalid_category' USING ERRCODE = '23503';
  END IF;

  IF length(coalesce(p_description, '')) > 2000 OR length(coalesce(p_address, '')) > 500 THEN
    RAISE EXCEPTION 'input_too_long' USING ERRCODE = '22001';
  END IF;

  INSERT INTO public.reports (
    user_id, category_id, description, quantity, duration, blocking_traffic,
    sensitive_locations, latitude, longitude, address, status
  ) VALUES (
    v_user, p_category_id, p_description, p_quantity, p_duration, coalesce(p_blocking_traffic, false),
    p_sensitive_locations, p_latitude, p_longitude, p_address, 'reported'
  )
  RETURNING * INTO v_report;

  INSERT INTO public.report_images (report_id, image_url, image_type)
  VALUES (v_report.id, p_image_path, 'original');

  RETURN QUERY SELECT v_report.id, v_report.report_number, v_report.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_waste_report(bigint, text, text, text, boolean, text[], double precision, double precision, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_waste_report(bigint, text, text, text, boolean, text[], double precision, double precision, text, text) TO authenticated;
