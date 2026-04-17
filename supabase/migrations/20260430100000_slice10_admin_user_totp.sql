-- ============================================================================
-- Slice 10 — TOTP two-factor auth for admin_users
-- ============================================================================
-- Stores per-user TOTP secrets + single-use backup codes. Enrollment is
-- optional; existing login continues to work until a user enrolls. We never
-- store raw backup codes — only PBKDF2 hashes (same format as passwords).
--
-- Tables:
--   admin_user_totp — one row per admin_user (when enrolled)
--   admin_user_totp_backup_codes — 10 rows per enrolled user (single-use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_user_totp (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id    UUID NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  secret           TEXT NOT NULL,
  confirmed_at     TIMESTAMPTZ,
  last_used_at     TIMESTAMPTZ,
  last_counter     BIGINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_user_totp_unique UNIQUE (admin_user_id)
);

COMMENT ON TABLE public.admin_user_totp IS
  'Per-user TOTP enrolment for admin_users. One row per user. Secret is base32, not encrypted (column itself is the access gate).';
COMMENT ON COLUMN public.admin_user_totp.confirmed_at IS
  'Null until the user successfully completes the enrolment OTP verification step.';
COMMENT ON COLUMN public.admin_user_totp.last_counter IS
  'The last successful TOTP time-step. Used to reject replay within the 30s window.';

CREATE TABLE IF NOT EXISTS public.admin_user_totp_backup_codes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id    UUID NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  code_hash        TEXT NOT NULL,
  consumed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_totp_backup_user
  ON public.admin_user_totp_backup_codes (admin_user_id)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.admin_user_totp_backup_codes IS
  'Single-use backup recovery codes. Stored as PBKDF2-SHA256 hashes (same format as passwords).';

-- Touch-updated_at trigger reuse (uses the shared tenancy_touch helper from Slice 0).
DROP TRIGGER IF EXISTS admin_user_totp_touch_updated_at ON public.admin_user_totp;
CREATE TRIGGER admin_user_totp_touch_updated_at
  BEFORE UPDATE ON public.admin_user_totp
  FOR EACH ROW
  EXECUTE FUNCTION public.tenancy_touch_updated_at();
