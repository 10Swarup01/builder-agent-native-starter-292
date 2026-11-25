-- Run once in the Supabase SQL Editor for the existing project.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'authority', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure column exists if table was created in an earlier migration
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen'
  CHECK (role IN ('citizen', 'authority', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Helper function: check admin privileges securely (empty search_path, schema-qualified)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    -- service_role connection
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

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 2. Role Protection Trigger: prevents self-promotion to admin by normal users
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Citizen default on creation unless caller is verified admin/service_role
    IF NEW.role IS NOT NULL AND NEW.role <> 'citizen' THEN
      IF NOT (
        CURRENT_USER IN ('postgres', 'supabase_admin')
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
        CURRENT_USER IN ('postgres', 'supabase_admin')
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
    CURRENT_USER IN ('postgres', 'supabase_admin')
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

-- 4. RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. User Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, pg_catalog.coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'citizen')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed missing profiles for existing users with default 'citizen'
INSERT INTO public.profiles (id, full_name, role)
SELECT id, pg_catalog.coalesce(raw_user_meta_data ->> 'full_name', ''), 'citizen'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
