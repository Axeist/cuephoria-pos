-- ============================================================================
-- Razorpay subscriptions: full lifecycle bookkeeping columns
-- ============================================================================
-- Adds the columns the rewritten /api/tenant/billing handler + subscription
-- webhook need to persist per Razorpay subscription:
--
--   plan_tier / billing_cycle  — denormalised convenience copies of plans.code
--                                and the existing `interval` column. Used by
--                                the new Billing page so it doesn't have to
--                                join plans on every render.
--   razorpay_status            — verbatim Razorpay state (created / authenticated /
--                                active / pending / halted / cancelled / completed /
--                                expired / paused). subscriptions.status keeps
--                                the INTERNAL bucket vocab the rest of the app
--                                already depends on (active / trialing / past_due /
--                                canceled / paused / suspended) — see
--                                src/server/handlers/platform/organization-action.ts
--                                and src/pages/OrganizationSettings.tsx.
--   total_count / paid_count / remaining_count — Razorpay counters mirrored
--                                from subscription.charged and subscription.updated
--                                webhooks. Always assigned from the payload
--                                (never incremented locally) so out-of-order
--                                deliveries stay idempotent.
--   charge_at / start_at / end_at — next-billing / first-billing / last-billing
--                                timestamps from the subscription resource.
--   last_payment_id / last_payment_amount — captured from subscription.charged.
--   scheduled_change           — JSONB recording a pending PATCH (plan_id /
--                                plan_tier / billing_cycle / requested_at).
--                                Cleared by subscription.updated when Razorpay
--                                actually applies the change at cycle_end.
--   access_suspended           — set true on halted / paused / cancelled /
--                                completed. UI surfaces this today; enforcing
--                                it across the POS app is a follow-up.
--
-- Safety:
--   * Non-destructive; re-runnable. Adds with IF NOT EXISTS.
--   * Backfills plan_tier from plans.code and billing_cycle from interval
--     so existing rows are immediately usable by the new UI.
--   * Does not change any CHECK constraint or RLS policy.
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier            TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle        TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_status      TEXT,
  ADD COLUMN IF NOT EXISTS total_count          INTEGER,
  ADD COLUMN IF NOT EXISTS paid_count           INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_count      INTEGER,
  ADD COLUMN IF NOT EXISTS charge_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_id      TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_amount  INTEGER,
  ADD COLUMN IF NOT EXISTS scheduled_change     JSONB,
  ADD COLUMN IF NOT EXISTS access_suspended     BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill plan_tier from joined plans.code so the new UI can render existing
-- subscriptions without a follow-up roundtrip.
UPDATE public.subscriptions s
   SET plan_tier = p.code
  FROM public.plans p
 WHERE s.plan_id = p.id AND s.plan_tier IS NULL;

-- Backfill billing_cycle from the existing interval column.
UPDATE public.subscriptions
   SET billing_cycle = COALESCE(billing_cycle, interval)
 WHERE billing_cycle IS NULL;

COMMENT ON COLUMN public.subscriptions.razorpay_status IS
  'Verbatim Razorpay subscription status (created / authenticated / active / pending / halted / cancelled / completed / expired / paused). subscriptions.status remains the internal bucket used by organization settings + platform admin actions.';
COMMENT ON COLUMN public.subscriptions.access_suspended IS
  'Set true when Razorpay halts / pauses / cancels / completes the subscription. Surfaced in the Billing UI today; gating across the POS app is a follow-up.';
COMMENT ON COLUMN public.subscriptions.scheduled_change IS
  'JSONB { plan_id, plan_tier, billing_cycle, requested_at } describing a pending PATCH that Razorpay will apply at the next cycle_end. Cleared by the subscription.updated webhook once applied.';
