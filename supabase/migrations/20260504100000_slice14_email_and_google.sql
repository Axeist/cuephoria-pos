-- ============================================================================
-- Slice 14 — Email (Resend) + Google Sign-in infrastructure
-- ============================================================================
-- Adds the data model required for:
--   * Transactional email (signup, verification, password reset, payment
--     receipts, trial reminders) via Resend.
--   * Google Sign-in / Sign-up (linking admin_users to a Google OAuth
--     identity).
--
-- Additions to admin_users:
--   * email               — primary contact address. Unique per row via a
--                           partial unique index on lower(email).
--   * email_verified_at   — when the owner confirmed the address. NULL means
--                           unverified; features that need trust (password
--                           reset, billing receipts) gate on this.
--   * google_sub          — the stable Google "sub" claim for that account.
--                           Unique via a partial unique index.
--   * avatar_url          — optional profile picture (Google pulls this).
--   * display_name        — optional human-friendly name ("Anish Kumar").
--
-- New table admin_user_email_tokens:
--   * Single-use tokens for verify_email + reset_password. The raw token is
--     mailed to the user; only its SHA-256 hash is persisted here. Expiry +
--     consumed_at enforce one-use-per-link.
--
-- Safety:
--   * All additions are nullable / have safe defaults.
--   * Partial unique indexes so existing NULLs don't trip uniqueness.
--   * Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) admin_users — new columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_sub        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url        TEXT,
  ADD COLUMN IF NOT EXISTS display_name      TEXT;

-- Case-insensitive email uniqueness, null-tolerant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_unique
  ON public.admin_users (lower(email))
  WHERE email IS NOT NULL;

-- Google sub uniqueness, null-tolerant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_google_sub_unique
  ON public.admin_users (google_sub)
  WHERE google_sub IS NOT NULL;

COMMENT ON COLUMN public.admin_users.email IS
  'Primary email address. Used for login recovery, verification, and transactional mail.';
COMMENT ON COLUMN public.admin_users.email_verified_at IS
  'When the user confirmed their email via a Resend verification link.';
COMMENT ON COLUMN public.admin_users.google_sub IS
  'Google OAuth "sub" claim; present when the user linked a Google identity.';
COMMENT ON COLUMN public.admin_users.avatar_url IS
  'Optional profile picture URL (auto-filled from Google, editable later).';
COMMENT ON COLUMN public.admin_users.display_name IS
  'Human-readable name shown in the UI (e.g. "Anish Kumar"). Separate from the login username.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2) admin_user_email_tokens — single-use email-link tokens
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_user_email_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   UUID NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  purpose         TEXT NOT NULL,
  token_hash      TEXT NOT NULL,
  email           TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  requested_ip    TEXT,
  requested_ua    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_user_email_tokens_purpose_check
    CHECK (purpose IN ('verify_email', 'reset_password')),
  CONSTRAINT admin_user_email_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user_purpose
  ON public.admin_user_email_tokens (admin_user_id, purpose)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_tokens_expiry
  ON public.admin_user_email_tokens (expires_at)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.admin_user_email_tokens IS
  'Single-use hashed tokens emailed to admin_users for verify_email + reset_password flows. Raw token is never stored; lookups are by SHA-256 hash.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3) email_events — minimal audit of outbound transactional mail
-- ────────────────────────────────────────────────────────────────────────────
-- Lightweight log so support can confirm "did the welcome email actually
-- send?" without trawling the Resend dashboard. We only store metadata,
-- never subject/body contents.
CREATE TABLE IF NOT EXISTS public.email_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  admin_user_id    UUID REFERENCES public.admin_users (id)   ON DELETE SET NULL,
  kind             TEXT NOT NULL,
  to_email         TEXT NOT NULL,
  provider         TEXT NOT NULL DEFAULT 'resend',
  provider_id      TEXT,
  status           TEXT NOT NULL DEFAULT 'queued',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_events_status_check
    CHECK (status IN ('queued', 'sent', 'failed', 'bounced', 'complained'))
);

CREATE INDEX IF NOT EXISTS idx_email_events_org     ON public.email_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_user    ON public.email_events (admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_kind    ON public.email_events (kind, created_at DESC);

COMMENT ON TABLE public.email_events IS
  'Audit trail of transactional emails dispatched by Cuetronix. Metadata only — no subject or body contents.';
