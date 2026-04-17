-- ============================================================================
-- SLICE 4 — Move admin_users.password from plaintext to hashed (PBKDF2-SHA256).
--
-- Strategy: additive columns + lazy migration.
--
--   1. Add `password_hash` (nullable) in the same serialized PBKDF2 format
--      already used by `platform_admins`: pbkdf2-sha256$<iter>$<saltB64>$<hashB64>.
--   2. Add `password_updated_at` for observability.
--   3. Add `must_change_password` flag for invited tenant owners.
--   4. Relax the NOT NULL on `password` so rehashed users can null it out.
--   5. Ops index locating users that are still on plaintext.
--
-- Rollback:
--   ALTER TABLE public.admin_users
--     DROP COLUMN password_hash, DROP COLUMN password_updated_at,
--     DROP COLUMN must_change_password;
-- ============================================================================

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS password_hash        TEXT,
  ADD COLUMN IF NOT EXISTS password_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'admin_users'
      AND column_name  = 'password'
      AND is_nullable  = 'NO'
  ) THEN
    EXECUTE 'ALTER TABLE public.admin_users ALTER COLUMN password DROP NOT NULL';
  END IF;
END$$;

-- Sanity constraint: the hash, if present, must begin with our expected tag.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_users_password_hash_format'
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_password_hash_format
      CHECK (password_hash IS NULL OR password_hash LIKE 'pbkdf2-sha256$%');
  END IF;
END$$;

-- Ops index: users still on legacy plaintext.
CREATE INDEX IF NOT EXISTS idx_admin_users_legacy_plaintext
  ON public.admin_users ((password_hash IS NULL))
  WHERE password IS NOT NULL AND password_hash IS NULL;

COMMENT ON COLUMN public.admin_users.password IS
  'LEGACY plaintext password. Kept only for rollout fallback; nulled by the login endpoint on a user''s first successful login once password_hash is written.';

COMMENT ON COLUMN public.admin_users.password_hash IS
  'PBKDF2-SHA256 serialized hash (pbkdf2-sha256$iter$saltB64$hashB64). When present, password_hash is the source of truth.';

COMMENT ON COLUMN public.admin_users.must_change_password IS
  'TRUE if the user must rotate their password before accessing the app. Invited tenant owners start with this set; cleared on successful change.';
