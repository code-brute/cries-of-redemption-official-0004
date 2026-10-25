-- ============================================================================
-- SUPABASE ALBUM & SONGS RELATIONSHIP SETUP
-- Cries Of Redemption
-- ============================================================================
-- How to apply:
-- 1. Open your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project and navigate to the 'SQL Editor' in the left sidebar
-- 3. Paste this entire file and click 'Run'
-- ============================================================================

-- 1. Add album_id to songs table (nullable with foreign key to albums.id)
ALTER TABLE public.songs
ADD COLUMN IF NOT EXISTS album_id BIGINT REFERENCES public.albums(id) ON DELETE SET NULL;

-- 2. Associate existing songs with the primary album ("A Collection of Singles", ID 1)
UPDATE public.songs
SET album_id = 1
WHERE album_id IS NULL;

-- 3. Create index for fast tracklist lookups by album
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON public.songs(album_id);

