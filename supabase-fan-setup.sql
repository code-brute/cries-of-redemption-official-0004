-- ============================================================================
-- SUPABASE FAN AUTH, MAILING LIST & USER PLAYLISTS SCHEMA
-- Cries Of Redemption
-- ============================================================================
-- How to apply:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project and navigate to the 'SQL Editor' in the left sidebar
-- 3. Paste this entire file and click 'Run'
-- ============================================================================

-- 1. MAILING LIST / SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS public.subscribers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'navbar_subscribe',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous or fan) can insert their email to subscribe
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT WITH CHECK (true);

-- Only verified admins can view all subscriber emails
DROP POLICY IF EXISTS "Admins read subscribers" ON public.subscribers;
CREATE POLICY "Admins read subscribers" ON public.subscribers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email')
  );

-- Admins can update/manage subscriber status
DROP POLICY IF EXISTS "Admins update subscribers" ON public.subscribers;
CREATE POLICY "Admins update subscribers" ON public.subscribers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email')
  );

-- 2. USER PLAYLISTS TABLE
CREATE TABLE IF NOT EXISTS public.user_playlists (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Playlist',
  song_titles TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_default_playlist UNIQUE (user_id, name)
);

ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

-- Users can only see, create, update, and delete their OWN playlists
DROP POLICY IF EXISTS "Users manage own playlists" ON public.user_playlists;
CREATE POLICY "Users manage own playlists" ON public.user_playlists
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional: grant permissions to anon and authenticated roles
GRANT SELECT, INSERT ON public.subscribers TO anon, authenticated;
GRANT ALL ON public.user_playlists TO authenticated;
