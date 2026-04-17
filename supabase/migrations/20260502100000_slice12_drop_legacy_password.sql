-- ============================================================================
-- Slice 12 — drop the legacy plaintext admin_users.password column
-- ============================================================================
-- Pre-flight: this migration REFUSES TO RUN if any admin_users row still has
-- a plaintext password value. That protects operators from accidentally
-- deploying before every user has logged in (lazy migration from Slice 4
-- rehashes on first successful login).
--
-- Before running:
--   1. Confirm the platform dashboard's "Password migration status" widget
--      reads 100% migrated (plaintextRemaining = 0).
--   2. Run this migration — it will drop the column and tidy up.
--
-- If you need to run it sooner (e.g. migrate the remaining users out-of-band),
-- force a password reset on the holdouts via the admin console first.
-- ============================================================================

DO $$
DECLARE
  plaintext_count BIGINT;
BEGIN
  -- Defensive: only attempt the check if the column still exists, so this
  -- migration is idempotent across reruns.
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'admin_users'
       AND column_name  = 'password'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.admin_users WHERE password IS NOT NULL AND password <> ''''' INTO plaintext_count;

    IF plaintext_count > 0 THEN
      RAISE EXCEPTION
        'Refusing to drop admin_users.password — % rows still hold plaintext. Rotate / login each holdout first, then re-run.',
        plaintext_count
        USING ERRCODE = 'P0001';
    END IF;

    -- Safe to drop. Also clean up any now-unused legacy helper columns.
    ALTER TABLE public.admin_users DROP COLUMN password;

    RAISE NOTICE 'Dropped admin_users.password. Slice 12 complete.';
  ELSE
    RAISE NOTICE 'admin_users.password already absent. Nothing to do.';
  END IF;
END
$$;

-- Document the final state.
COMMENT ON TABLE public.admin_users IS
  'Tenant admin identities. Credentials live exclusively in password_hash (PBKDF2-SHA256). Plaintext column removed in Slice 12.';
