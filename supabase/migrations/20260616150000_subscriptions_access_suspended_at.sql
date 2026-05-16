-- ============================================================================
-- Razorpay subscriptions: grace-window anchor (access_suspended_at)
-- ============================================================================
-- The Subscription gate now grants a 1-hour grace window after Razorpay
-- suspends access (halt / pause / cancel / complete), so the tenant has a
-- runway to retry the payment from /subscription before the workspace is
-- fully locked. To enforce that deterministically we need to know WHEN the
-- suspension started.
--
-- This migration adds the anchor column. The webhook is updated separately to
-- stamp this column on the false->true transition (preserving the original
-- timestamp on repeated halted events) and to null it back out on resume /
-- charge / reactivate.
--
-- Safety:
--   * Re-runnable. ADD COLUMN IF NOT EXISTS + idempotent backfill.
--   * Backfill marks `NOW()` on any row that is currently suspended without
--     an anchor, so existing offenders get exactly one hour of grace measured
--     from when this migration ran. That's the most generous fail-safe
--     interpretation (otherwise we'd have to lock them out immediately on
--     deploy).
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS access_suspended_at TIMESTAMPTZ;

-- Backfill: any row currently flagged access_suspended=true but lacking the
-- anchor gets NOW() so the grace window starts ticking from deploy time
-- rather than retroactively locking the workspace.
UPDATE public.subscriptions
   SET access_suspended_at = NOW()
 WHERE access_suspended = TRUE
   AND access_suspended_at IS NULL;

COMMENT ON COLUMN public.subscriptions.access_suspended_at IS
  'Wall-clock time at which Razorpay first suspended access (halt / pause / cancel / complete). Used by SubscriptionGate as the start of a 1-hour grace window before the workspace is fully locked. Cleared back to NULL on subscription.activated / charged / resumed.';
