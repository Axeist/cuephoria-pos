-- ============================================================================
-- SLICE 5 — admin_users.password_version (global session revocation).
--
-- Purpose
--   Every signed session carries the password_version captured at login.
--   Rotating the password increments the counter, so any still-active
--   cookie on another device is rejected on its next server call.
--
-- Behaviour rules
--   * Column defaults to 1 and is NOT NULL.
--   * change-password bumps this by 1 atomically.
--   * login reads the current value into the JWT.
--   * Sessions without a `pv` claim (pre-Slice-5 cookies) are treated as
--     legacy and left alone until their natural 8h expiry. Enforcement is
--     additive, never retroactive.
--
-- Rollback
--   ALTER TABLE public.admin_users DROP COLUMN password_version;
-- ============================================================================

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.admin_users.password_version IS
  'Incremented on every password change. Sessions pin this value at login and are invalidated the instant it drifts.';
