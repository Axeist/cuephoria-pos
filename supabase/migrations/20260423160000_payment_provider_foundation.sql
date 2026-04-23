-- Payment provider foundation:
-- 1) server-managed gateway config per organization/provider
-- 2) webhook idempotency table across providers
-- 3) Stripe-ready nullable plan mapping columns (not active yet)

CREATE TABLE IF NOT EXISTS public.payment_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  supported_currencies TEXT[] NOT NULL DEFAULT ARRAY['INR']::TEXT[],
  is_international_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  webhook_last_event_at TIMESTAMPTZ NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID NULL REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_configs_org
  ON public.payment_gateway_configs (organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_configs_provider
  ON public.payment_gateway_configs (provider);

ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS payment_gateway_configs_touch_updated_at ON public.payment_gateway_configs;
CREATE TRIGGER payment_gateway_configs_touch_updated_at
  BEFORE UPDATE ON public.payment_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION public.tenancy_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_org
  ON public.payment_webhook_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_type
  ON public.payment_webhook_events (event_type);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_price_id_month TEXT NULL,
  ADD COLUMN IF NOT EXISTS stripe_price_id_year TEXT NULL;
