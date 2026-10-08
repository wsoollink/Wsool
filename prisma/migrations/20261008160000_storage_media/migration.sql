-- Public "media" bucket for creator page files (photos, logos, videos, license files).
-- Files are public because they appear on public pages.
-- Uploads only happen through signed upload URLs that the server creates after
-- checking the signed-in creator, file type and size (src/lib/storage.ts), so no
-- storage.objects write policies are granted to anon/authenticated.
-- Guarded so the migration also applies to local Postgres, which has no storage schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'media', 'media', true, 52428800,
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/quicktime', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
