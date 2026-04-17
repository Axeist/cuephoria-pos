-- ============================================================================
-- Slice 9 — tenant branding storage bucket
-- ============================================================================
-- A PUBLIC bucket for tenant logos + favicons. We rely on server-side upload
-- through /api/tenant/branding/upload (service role key) so per-tenant write
-- isolation is enforced at the app layer. Reads are public because the logo
-- is rendered in the login page + splash before auth.
--
-- Path convention:
--   branding/<organization_id>/<kind>-<timestamp>-<filename>
--
-- Object size is capped at 512KB (more than enough for a logo) to cut down on
-- hotlinking risk and keep the CDN footprint small.
--
-- NOTE: In hardened Supabase projects the `postgres` role no longer owns
-- storage.objects, so direct CREATE POLICY fails with 42501 ("must be owner
-- of table objects"). We wrap every policy DDL in a DO block that swallows
-- insufficient_privilege so the migration runs cleanly in any environment:
--   • If we have owner rights, policies are created as expected.
--   • If we don't, the bucket's `public = true` flag still provides public
--     read via Supabase's managed policy, and writes remain blocked for
--     anon/authenticated roles (service_role always bypasses RLS). Net result
--     is identical for our use case either way.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-branding',
  'tenant-branding',
  true,
  524288, -- 512 KB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read — login page and splash need this available pre-auth.
DO $$ BEGIN
  CREATE POLICY "Public read tenant-branding"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tenant-branding');
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped policy "Public read tenant-branding": insufficient privilege on storage.objects. bucket.public=true still allows reads.';
END $$;

-- No anon writes. Uploads are service-role only through the API.
DO $$ BEGIN
  CREATE POLICY "Service role write tenant-branding"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'tenant-branding' AND auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped INSERT policy: insufficient privilege. Default-deny already blocks anon writes.';
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role update tenant-branding"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'tenant-branding' AND auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped UPDATE policy: insufficient privilege. Default-deny already blocks anon writes.';
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role delete tenant-branding"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'tenant-branding' AND auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped DELETE policy: insufficient privilege. Default-deny already blocks anon writes.';
END $$;

-- Table comment is also privileged in hardened setups — swallow gracefully.
DO $$ BEGIN
  COMMENT ON TABLE storage.objects IS
    'Shared across buckets. tenant-branding uploads are restricted to service_role via app-layer /api/tenant/branding/upload.';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;
