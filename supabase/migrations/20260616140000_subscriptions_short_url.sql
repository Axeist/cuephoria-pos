-- ============================================================================
-- Razorpay subscriptions: add short_url (hosted mandate URL)
-- ============================================================================
-- Follow-up to 20260616130000_subscriptions_full_lifecycle_columns.sql.
--
-- The lifecycle migration above was first shipped without `short_url`, but the
-- rewritten /api/tenant/billing handler (POST create / renew) persists it on
-- every row and the GET handler selects it back so the new Billing page can
-- offer a "open hosted mandate" fallback when Razorpay Checkout is blocked.
--
-- This migration adds the column for environments that already ran the
-- lifecycle migration before short_url was appended. Safe to re-run because
-- of IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS short_url TEXT;

COMMENT ON COLUMN public.subscriptions.short_url IS
  'Razorpay-hosted subscription authentication URL (https://rzp.io/i/...). Captured at create time and from every subscription.* webhook. Used by the Billing UI as a fallback when the Razorpay Checkout script is blocked.';
