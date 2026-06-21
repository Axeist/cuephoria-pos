-- Membership platform: tiers, cards, ledger, coupons, settings
-- Rollback:
--   DROP TABLE IF EXISTS public.membership_ledger CASCADE;
--   DROP TABLE IF EXISTS public.membership_coupons CASCADE;
--   DROP TABLE IF EXISTS public.membership_cards CASCADE;
--   DROP TABLE IF EXISTS public.membership_recharge_tiers CASCADE;
--   DROP TABLE IF EXISTS public.membership_settings CASCADE;
--   DROP TABLE IF EXISTS public.membership_tiers CASCADE;
--   ALTER TABLE public.customers DROP COLUMN IF EXISTS membership_tier_id;
--   ALTER TABLE public.customers DROP COLUMN IF EXISTS card_balance;
--   ALTER TABLE public.customers DROP COLUMN IF EXISTS active_card_id;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS membership_tier_id;
--   ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;
--   ALTER TABLE public.bills ADD CONSTRAINT bills_payment_method_check
--     CHECK (payment_method IN ('cash', 'upi', 'split', 'credit', 'razorpay', 'complimentary'));

-- ---------------------------------------------------------------------------
-- Tiers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  playtime_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  fnb_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  card_payment_fnb_enabled BOOLEAN NOT NULL DEFAULT false,
  booking_pay_at_venue_enabled BOOLEAN NOT NULL DEFAULT false,
  min_recharge_amount NUMERIC(12,2),
  max_card_balance NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT membership_tiers_org_slug_unique UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_membership_tiers_org ON public.membership_tiers (organization_id);

-- ---------------------------------------------------------------------------
-- Settings (workspace + optional branch override)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE CASCADE,
  registration_deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  replacement_card_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  replacement_card_product_id UUID REFERENCES public.products (id) ON DELETE SET NULL,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT membership_settings_org_location_unique UNIQUE (organization_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_settings_org ON public.membership_settings (organization_id);

-- ---------------------------------------------------------------------------
-- Recharge tiers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_recharge_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  membership_tier_id UUID REFERENCES public.membership_tiers (id) ON DELETE SET NULL,
  pay_amount NUMERIC(12,2) NOT NULL,
  credit_amount NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_recharge_tiers_org ON public.membership_recharge_tiers (organization_id);

-- ---------------------------------------------------------------------------
-- Physical NFC cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations (id) ON DELETE SET NULL,
  uid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inventory'
    CHECK (status IN ('inventory', 'assigned', 'lost', 'retired')),
  customer_id UUID REFERENCES public.customers (id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT membership_cards_org_uid_unique UNIQUE (organization_id, uid)
);

CREATE INDEX IF NOT EXISTS idx_membership_cards_org ON public.membership_cards (organization_id);
CREATE INDEX IF NOT EXISTS idx_membership_cards_customer ON public.membership_cards (customer_id);
CREATE INDEX IF NOT EXISTS idx_membership_cards_uid ON public.membership_cards (organization_id, uid);

-- ---------------------------------------------------------------------------
-- Card balance ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('recharge', 'redemption', 'deposit', 'refund', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  created_by UUID REFERENCES public.admin_users (id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_ledger_customer ON public.membership_ledger (customer_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Member coupons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  member_only BOOLEAN NOT NULL DEFAULT true,
  membership_tier_id UUID REFERENCES public.membership_tiers (id) ON DELETE SET NULL,
  allows_venue_payment BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  max_uses INT,
  uses_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT membership_coupons_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_membership_coupons_org ON public.membership_coupons (organization_id);

-- ---------------------------------------------------------------------------
-- Customer + product extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS membership_tier_id UUID REFERENCES public.membership_tiers (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_card_id UUID REFERENCES public.membership_cards (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_membership_tier ON public.customers (membership_tier_id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS membership_tier_id UUID REFERENCES public.membership_tiers (id) ON DELETE SET NULL;

-- Bills: card payment method
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;
ALTER TABLE public.bills ADD CONSTRAINT bills_payment_method_check
  CHECK (payment_method IN ('cash', 'upi', 'split', 'credit', 'razorpay', 'complimentary', 'card'));

-- ---------------------------------------------------------------------------
-- RLS (service-role admin API; deny anon direct access)
-- ---------------------------------------------------------------------------
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_recharge_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_coupons ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Data migration: existing members → Migrated tier (Growth+ orgs only)
-- ---------------------------------------------------------------------------
INSERT INTO public.membership_tiers (
  organization_id, name, slug, sort_order, playtime_discount_pct, is_active
)
SELECT DISTINCT c.organization_id, 'Migrated', 'migrated', 0, 50, true
FROM public.customers c
WHERE c.is_member = true
  AND c.organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.plans p ON p.id = s.plan_id
    WHERE s.organization_id = c.organization_id
      AND lower(coalesce(p.code, s.plan_tier, 'starter')) IN ('growth', 'pro', 'enterprise', 'internal')
  )
ON CONFLICT (organization_id, slug) DO NOTHING;

UPDATE public.customers c
SET membership_tier_id = t.id
FROM public.membership_tiers t
WHERE c.is_member = true
  AND c.organization_id = t.organization_id
  AND t.slug = 'migrated'
  AND c.membership_tier_id IS NULL;

UPDATE public.customers c
SET membership_tier_id = NULL
FROM public.subscriptions s
JOIN public.plans p ON p.id = s.plan_id
WHERE c.organization_id = s.organization_id
  AND lower(coalesce(p.code, s.plan_tier, 'starter')) = 'starter';

-- Enable module for orgs with existing members on Growth+
INSERT INTO public.membership_settings (organization_id, location_id, feature_flags)
SELECT DISTINCT c.organization_id, NULL::uuid,
  jsonb_build_object(
    'module_enabled', true,
    'tier_plans_enabled', true
  )
FROM public.customers c
WHERE c.membership_tier_id IS NOT NULL
ON CONFLICT (organization_id, location_id) DO UPDATE
SET feature_flags = membership_settings.feature_flags
  || jsonb_build_object('module_enabled', true, 'tier_plans_enabled', true);

-- Simulation UIDs for Preview (per org with module enabled)
INSERT INTO public.membership_cards (organization_id, uid, status)
SELECT ms.organization_id, 'SIM-UID-001', 'inventory'
FROM public.membership_settings ms
WHERE (ms.feature_flags->>'module_enabled')::boolean IS true
ON CONFLICT (organization_id, uid) DO NOTHING;

INSERT INTO public.membership_cards (organization_id, uid, status)
SELECT ms.organization_id, 'SIM-UID-002', 'inventory'
FROM public.membership_settings ms
WHERE (ms.feature_flags->>'module_enabled')::boolean IS true
ON CONFLICT (organization_id, uid) DO NOTHING;

COMMENT ON TABLE public.membership_tiers IS 'Configurable membership tier plans per organization';
COMMENT ON TABLE public.membership_settings IS 'Workspace/branch membership feature flags and fee config';
