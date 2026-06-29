-- Unified promo coupons (replaces hardcoded + fragmented coupon sources)
-- Rollback:
--   DROP TABLE IF EXISTS public.promo_coupon_redemptions CASCADE;
--   DROP TABLE IF EXISTS public.promo_coupons CASCADE;

CREATE TABLE IF NOT EXISTS public.promo_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed', 'flat_rate')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_scope TEXT NOT NULL DEFAULT 'whole_booking'
    CHECK (discount_scope IN ('whole_booking', 'per_station', 'per_station_type')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['public_booking']::TEXT[],
  member_only BOOLEAN NOT NULL DEFAULT false,
  membership_tier_ids UUID[],
  customer_groups TEXT[] NOT NULL DEFAULT ARRAY['all']::TEXT[],
  allows_online_payment BOOLEAN NOT NULL DEFAULT true,
  allows_venue_payment BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  eligibility_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  gates JSONB NOT NULL DEFAULT '{}'::jsonb,
  stackable BOOLEAN NOT NULL DEFAULT false,
  max_uses_total INT,
  uses_count INT NOT NULL DEFAULT 0,
  max_uses_per_customer INT,
  success_message TEXT,
  emoji TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promo_coupons_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_promo_coupons_org ON public.promo_coupons (organization_id);
CREATE INDEX IF NOT EXISTS idx_promo_coupons_location ON public.promo_coupons (location_id);
CREATE INDEX IF NOT EXISTS idx_promo_coupons_code ON public.promo_coupons (organization_id, code);

CREATE TABLE IF NOT EXISTS public.promo_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES public.promo_coupons (id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_coupon_redemptions_coupon ON public.promo_coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS idx_promo_coupon_redemptions_customer ON public.promo_coupon_redemptions (customer_id, coupon_id);

ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Backfill membership_coupons
INSERT INTO public.promo_coupons (
  organization_id, code, description, enabled, discount_type, discount_value,
  discount_scope, channels, member_only, membership_tier_ids,
  allows_online_payment, allows_venue_payment, valid_from, valid_until,
  max_uses_total, uses_count, max_uses_per_customer, created_at, updated_at
)
SELECT
  mc.organization_id,
  upper(mc.code),
  coalesce(mc.description, ''),
  mc.enabled,
  mc.discount_type,
  mc.discount_value,
  'whole_booking',
  ARRAY['public_booking', 'pos_session', 'venue_payment']::TEXT[],
  mc.member_only,
  CASE WHEN mc.membership_tier_id IS NOT NULL THEN ARRAY[mc.membership_tier_id] ELSE NULL END,
  true,
  mc.allows_venue_payment,
  mc.valid_from,
  mc.valid_until,
  mc.max_uses,
  mc.uses_count,
  NULL,
  mc.created_at,
  mc.updated_at
FROM public.membership_coupons mc
ON CONFLICT (organization_id, code) DO NOTHING;
