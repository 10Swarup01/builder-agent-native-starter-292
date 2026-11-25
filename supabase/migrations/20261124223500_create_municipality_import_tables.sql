-- ====================================================================
-- Forward-only migration: AI Municipality Data Importer & Verified Public Authorities
-- Ensures existing tables, profiles, and policies are fully protected.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Ensure public.profiles has the role column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'
  CHECK (role IN ('citizen', 'authority', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 1. Helper function: evaluate administrator privileges safely across RLS policies
-- Configured with empty search_path and fully schema-qualified references
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    -- Direct service_role connection or service_role JWT
    (COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), ''), '') = 'service_role')
    OR (auth.jwt() ->> 'role' = 'service_role')
    -- Supabase Auth app_metadata (managed solely by server admin API)
    OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    -- Database profile role verified in public.profiles
    OR (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )),
    false
  );
$$;

-- Restrict execution permissions for is_admin()
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 2. Role Protection Trigger: strictly prevents self-promotion to admin by normal users
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Citizen default on creation unless caller is verified admin or service_role
    IF NEW.role IS NOT NULL AND NEW.role <> 'citizen' THEN
      IF NOT (
        pg_catalog.current_user IN ('postgres', 'supabase_admin')
        OR (COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), ''), '') = 'service_role')
        OR (COALESCE(NULLIF(pg_catalog.current_setting('role', true), ''), '') = 'service_role')
        OR (public.is_admin())
      ) THEN
        NEW.role := 'citizen';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If role is changing, caller must be an authorized admin or service_role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        pg_catalog.current_user IN ('postgres', 'supabase_admin')
        OR (COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), ''), '') = 'service_role')
        OR (COALESCE(NULLIF(pg_catalog.current_setting('role', true), ''), '') = 'service_role')
        OR (public.is_admin())
      ) THEN
        RAISE EXCEPTION 'Access denied: only administrators can modify user roles.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- 3. Dedicated Admin Role Assignment Procedure
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    pg_catalog.current_user IN ('postgres', 'supabase_admin')
    OR (COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), ''), '') = 'service_role')
    OR (public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Access denied: only administrators can assign user roles.';
  END IF;

  IF new_role NOT IN ('citizen', 'authority', 'admin') THEN
    RAISE EXCEPTION 'Invalid role specified: %', new_role;
  END IF;

  UPDATE public.profiles
  SET role = new_role
  WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated, service_role;

-- 4. RLS Update Policies for Profiles (Admins can update any profile; citizens can only update their own non-role fields)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Import Jobs Table
CREATE TABLE IF NOT EXISTS public.municipality_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'partial_failure', 'failed')),
    total_images INTEGER NOT NULL DEFAULT 0,
    processed_images INTEGER NOT NULL DEFAULT 0,
    failed_images INTEGER NOT NULL DEFAULT 0,
    total_records_extracted INTEGER NOT NULL DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 6. Source Images Table
CREATE TABLE IF NOT EXISTS public.municipality_source_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.municipality_import_jobs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    page_number INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    raw_ocr_response JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Staging / Human Review Records Table
CREATE TABLE IF NOT EXISTS public.municipality_import_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.municipality_import_jobs(id) ON DELETE CASCADE,
    source_image_id UUID REFERENCES public.municipality_source_images(id) ON DELETE SET NULL,
    state TEXT NOT NULL DEFAULT 'West Bengal',
    district TEXT NOT NULL,
    municipality TEXT NOT NULL,
    municipality_type TEXT NOT NULL DEFAULT 'Municipal Corporation',
    ward_number INTEGER,
    councillor_name TEXT,
    councillor_name_bengali TEXT,
    designation TEXT DEFAULT 'Councillor',
    contact_number TEXT,
    alternate_contact_number TEXT,
    email TEXT,
    office_address TEXT,
    pin_code TEXT,
    extra_details JSONB DEFAULT '{}'::jsonb,
    original_text TEXT,
    confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'needs_review', 'approved', 'rejected', 'imported')),
    warnings JSONB DEFAULT '[]'::jsonb,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Production Public Authorities Table
-- Default is_verified changed to FALSE as required.
CREATE TABLE IF NOT EXISTS public.municipal_authorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    municipality TEXT NOT NULL,
    municipality_type TEXT NOT NULL,
    ward_number INTEGER NOT NULL,
    councillor_name TEXT NOT NULL,
    councillor_name_bengali TEXT,
    designation TEXT NOT NULL DEFAULT 'Councillor',
    contact_number TEXT,
    alternate_contact_number TEXT,
    email TEXT,
    office_address TEXT,
    pin_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    extra_details JSONB DEFAULT '{}'::jsonb,
    source_image_id UUID REFERENCES public.municipality_source_images(id) ON DELETE SET NULL,
    import_job_id UUID REFERENCES public.municipality_import_jobs(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_municipality_ward UNIQUE (state, district, municipality, ward_number)
);

-- 9. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_authorities_search ON public.municipal_authorities (district, municipality, ward_number);
CREATE INDEX IF NOT EXISTS idx_authorities_verified ON public.municipal_authorities (is_verified);
CREATE INDEX IF NOT EXISTS idx_import_records_status ON public.municipality_import_records (verification_status, job_id);
CREATE INDEX IF NOT EXISTS idx_import_records_ward ON public.municipality_import_records (ward_number);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.municipality_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipality_source_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipality_import_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipal_authorities ENABLE ROW LEVEL SECURITY;

-- 11. Table Grants
REVOKE ALL ON public.municipality_import_jobs FROM anon;
REVOKE ALL ON public.municipality_source_images FROM anon;
REVOKE ALL ON public.municipality_import_records FROM anon;
GRANT ALL ON public.municipality_import_jobs TO authenticated, service_role;
GRANT ALL ON public.municipality_source_images TO authenticated, service_role;
GRANT ALL ON public.municipality_import_records TO authenticated, service_role;

GRANT SELECT ON public.municipal_authorities TO anon, authenticated;
GRANT ALL ON public.municipal_authorities TO authenticated, service_role;

-- 12. RLS Policies

-- Public can view ONLY verified municipal authorities
DROP POLICY IF EXISTS "Public can view verified municipal authorities" ON public.municipal_authorities;
CREATE POLICY "Public can view verified municipal authorities"
ON public.municipal_authorities FOR SELECT
USING (is_verified = TRUE);

-- Admins can manage municipal authorities
DROP POLICY IF EXISTS "Admins can manage municipal authorities" ON public.municipal_authorities;
CREATE POLICY "Admins can manage municipal authorities"
ON public.municipal_authorities FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Import tables accessible only to authorized administrators and service role
DROP POLICY IF EXISTS "Admins have full access to import jobs" ON public.municipality_import_jobs;
CREATE POLICY "Admins have full access to import jobs"
ON public.municipality_import_jobs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to source images" ON public.municipality_source_images;
CREATE POLICY "Admins have full access to source images"
ON public.municipality_source_images FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to import records" ON public.municipality_import_records;
CREATE POLICY "Admins have full access to import records"
ON public.municipality_import_records FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
