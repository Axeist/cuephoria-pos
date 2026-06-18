-- ============================================================================
-- Backfill: mark existing admin users as email-verified
-- ============================================================================
-- Context:
-- Existing legacy users may have a valid email but NULL email_verified_at,
-- which blocks login after verification enforcement was introduced.
--
-- This migration marks current email-bearing users as verified.
-- It is intentionally scoped to rows that already have an email set.
-- ============================================================================

UPDATE public.admin_users
SET email_verified_at = now()
WHERE email_verified_at IS NULL
  AND email IS NOT NULL;

