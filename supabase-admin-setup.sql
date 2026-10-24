-- ============================================================================
-- CRIES OF REDEMPTION — ADMIN ACCESS + MEDIA STORAGE (run once in Supabase SQL Editor)
-- ============================================================================
-- Safe to run on your EXISTING database:
--   * Does NOT create, drop, or modify any of your content tables or rows.
--   * Only adds: an admin allow-list, a helper function, write policies, and a
--     public "media" storage bucket for uploads.
--   * Can be re-run safely (idempotent).
--
-- BEFORE RUNNING: replace  YOUR-ADMIN-EMAIL@example.com  (Step 1) with the email
-- of the user you create under Authentication -> Users. Do this in the SQL Editor,
-- not in this file, so your email isn't committed to the public GitHub repo.
-- ============================================================================

-- Step 1. Admin allow-list. Only these emails can change content.
CREATE TABLE IF NOT EXISTS public.admin_users (
  email      TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;   -- no policies = not readable via the API

INSERT INTO public.admin_users (email)
VALUES (LOWER('YOUR-ADMIN-EMAIL@example.com'))
ON CONFLICT (email) DO NOTHING;

-- Step 2. Helper: is the logged-in user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Step 3. Write policies on the content tables (admins only).
--         The existing public READ policies are left exactly as they are.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['band_profile','albums','songs','photos','videos','press_articles','blog_posts']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "Admin insert %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Admin insert %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Admin update %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Admin update %s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Admin delete %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Admin delete %s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
  END LOOP;
END $$;

-- Step 4. Public "media" bucket for uploaded audio, artwork, photos (any file type).
--         Files are publicly readable by URL; only admins can upload/replace/delete.
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Admin upload media" ON storage.objects;
CREATE POLICY "Admin upload media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_admin());

DROP POLICY IF EXISTS "Admin update media" ON storage.objects;
CREATE POLICY "Admin update media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin());

DROP POLICY IF EXISTS "Admin delete media" ON storage.objects;
CREATE POLICY "Admin delete media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin());

-- Step 5. Check: should list your email.
SELECT email FROM public.admin_users;

