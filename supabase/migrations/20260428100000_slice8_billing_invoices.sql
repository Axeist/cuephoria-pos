-- ============================================================================
-- Slice 8 — Razorpay subscription lifecycle: invoices + plan <> razorpay map
-- ============================================================================
-- Adds:
--   * plans.razorpay_plan_id_month / _year — the pre-created Razorpay plan IDs
--     (set via the platform dashboard or a one-time seed; not the rupee price).
--   * subscriptions.razorpay_customer_id / razorpay_subscription_id mirrors
--     the generic provider_* columns but keeps the Razorpay id denormalised
--     for webhook lookups (provider_* retained for forward compat).
--   * public.invoices — one row per Razorpay invoice.paid / invoice.created
--     webhook. The in-app billing screen renders this directly.
--
-- Safety:
--   * Non-destructive; re-runnable. Adds with IF NOT EXISTS.
--   * Does not touch the internal Cuephoria subscription row.
--   * organization_id lookups are unique in memberships so tenant isolation
--     stays intact at the app layer.
-- ============================================================================

-- 1) plans — add Razorpay plan IDs (monthly + yearly)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_month TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id_year  TEXT;

COMMENT ON COLUMN public.plans.razorpay_plan_id_month IS
  'Razorpay plan_id for the monthly billing cycle (plan_XXXX). Nullable for free/internal plans.';
COMMENT ON COLUMN public.plans.razorpay_plan_id_year IS
  'Razorpay plan_id for the yearly billing cycle (plan_XXXX). Nullable for free/internal plans.';

-- 2) subscriptions — denormalised Razorpay IDs for fast webhook lookups
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS cancel_requested_at       TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub
  ON public.subscriptions (razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.razorpay_subscription_id IS
  'Razorpay sub_* identifier. Unique (partial) so webhook upserts resolve atomically.';

-- 3) invoices — one row per Razorpay invoice.paid
CREATE TABLE IF NOT EXISTS public.invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  subscription_id           UUID REFERENCES public.subscriptions (id) ON DELETE SET NULL,
  provider                  TEXT NOT NULL DEFAULT 'razorpay',
  provider_invoice_id       TEXT,
  provider_subscription_id  TEXT,
  provider_payment_id       TEXT,
  status                    TEXT NOT NULL DEFAULT 'paid',
  amount_inr                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency                  TEXT NOT NULL DEFAULT 'INR',
  period_start              TIMESTAMPTZ,
  period_end                TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  short_url                 TEXT,
  raw                       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT invoices_status_check
    CHECK (status IN ('paid', 'issued', 'failed', 'refunded', 'partial_refund', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_org         ON public.invoices (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_id ON public.invoices (provider_invoice_id) WHERE provider_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_sub         ON public.invoices (subscription_id);

COMMENT ON TABLE public.invoices IS
  'Billing invoices mirrored from Razorpay webhooks. Source of truth for the in-app history UI.';

-- Same organization_id auto-fill strategy as the hotfix for ops tables, in
-- case somebody inserts an invoice without org but with a subscription.
CREATE OR REPLACE FUNCTION public.fill_invoice_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.subscription_id IS NOT NULL THEN
    SELECT organization_id
      INTO NEW.organization_id
      FROM public.subscriptions
     WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_invoice_organization_id ON public.invoices;
CREATE TRIGGER trg_fill_invoice_organization_id
  BEFORE INSERT OR UPDATE OF subscription_id, organization_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fill_invoice_organization_id();

-- 4) Audit-log action grammar: billing actions
--    (no schema change; just documented so grep-ability is easy.)
--       subscription.created / .updated / .cancelled / .resumed
--       subscription.webhook.ignored
--       invoice.paid / invoice.failed
--       plan.razorpay_id.updated
COMMENT ON TABLE public.audit_log IS
  'Append-only event trail. Billing actions: subscription.*, invoice.*, plan.razorpay_id.updated.';
