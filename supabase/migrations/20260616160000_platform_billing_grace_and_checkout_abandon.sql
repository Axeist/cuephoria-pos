-- ============================================================================
-- Platform-wide billing grace + abandoned mandate tracking
-- ============================================================================
-- 1) `platform_settings` — singleton row (id=1) with
--    `billing_access_grace_minutes`, edited from the operator console and
--    read by tenant `/api/admin/me` + SubscriptionGate (Razorpay suspend
--    grace + abandoned-checkout grace).
-- 2) `subscriptions.checkout_abandoned_at` — first time the tenant dismisses
--    Razorpay checkout without completing mandate (status still `created`);
--    combined with operator-configured grace to show countdown + retry CTA.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id                           SMALLINT PRIMARY KEY DEFAULT 1,
  billing_access_grace_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (billing_access_grace_minutes >= 1 AND billing_access_grace_minutes <= 10080),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);

INSERT INTO public.platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.platform_settings.billing_access_grace_minutes IS
  'How long tenants keep POS access after (a) Razorpay billing suspension anchors or (b) they dismiss checkout while status is created — configurable from Platform Overview. Max 10080 (= 7 days).';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS checkout_abandoned_at TIMESTAMPTZ;

COMMENT ON COLUMN public.subscriptions.checkout_abandoned_at IS
  'Set when Razorpay Standard Checkout is dismissed without mandate completion while razorpay_status is still created. Anchors the configurable grace window for retaining access until payment.';
