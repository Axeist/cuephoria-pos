-- ============================================================================
-- SLICE 0 — Multi-tenant foundation (Cuetronix SaaS)
-- ============================================================================
--
-- Purpose:
--   Introduce the tenancy layer (organizations + plans + subscriptions +
--   memberships + platform admins + audit log) above today's single-business
--   multi-location schema, and attach organization_id to every hot operational
--   table. The live Cuephoria operation (Main + Lite + Cafe) is backfilled as
--   a single organization on an "internal" plan so it is never billed or
--   limited by tier caps.
--
-- Safety invariants:
--   1. Purely additive. No existing column, table, trigger, view, or policy
--      is renamed, dropped, or altered in a way that changes behavior for
--      Cuephoria staff or customers.
--   2. Idempotent. Safe to re-run; every statement uses IF NOT EXISTS /
--      ON CONFLICT DO NOTHING.
--   3. No RLS is enabled on new tables yet (service role only in Slice 0).
--      RLS lands in Slice 1 behind a feature flag.
--   4. organization_id on hot tables is backfilled from location_id and then
--      set NOT NULL inside this migration, so the schema ends fully populated.
--
-- Rollback (documented — not executed unless explicitly needed):
--   - DROP TABLE public.audit_log, platform_admins, org_memberships,
--     subscriptions, plan_features, plans, organizations CASCADE;
--   - ALTER TABLE <hot tables> DROP COLUMN organization_id;
--   Backfilled rows in existing tables are not destroyed; only the new
--   organization_id columns and tenancy tables are removed.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0) Ensure gen_random_uuid() is available (pgcrypto)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- 1) organizations — the tenant / workspace
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  legal_name      TEXT,
  country         TEXT NOT NULL DEFAULT 'IN',
  currency        TEXT NOT NULL DEFAULT 'INR',
  timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status          TEXT NOT NULL DEFAULT 'active',
  is_internal     BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_unique UNIQUE (slug),
  CONSTRAINT organizations_status_check
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations (status);

COMMENT ON TABLE public.organizations IS
  'Tenants of the Cuetronix SaaS. One row = one paying customer (except is_internal=true, e.g. Cuephoria).';
COMMENT ON COLUMN public.organizations.slug IS
  'URL slug used at /app/t/{slug}. Lowercase, alphanumeric + dashes.';
COMMENT ON COLUMN public.organizations.is_internal IS
  'Cuephoria and other internal tenants. Bypass billing gates and tier limits.';


-- ---------------------------------------------------------------------------
-- 2) plans — catalog of subscription tiers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  is_public        BOOLEAN NOT NULL DEFAULT true,
  price_inr_month  NUMERIC(10, 2),
  price_inr_year   NUMERIC(10, 2),
  price_usd_month  NUMERIC(10, 2),
  price_usd_year   NUMERIC(10, 2),
  sort_order       INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plans_code_unique UNIQUE (code)
);

COMMENT ON TABLE public.plans IS
  'Subscription tier catalog. Code is the stable identifier used by billing provider price IDs.';
COMMENT ON COLUMN public.plans.is_public IS
  'false for internal / enterprise-only plans that should not appear on the pricing page.';


-- ---------------------------------------------------------------------------
-- 3) plan_features — per-plan limits and feature flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_features (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID NOT NULL REFERENCES public.plans (id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_features_plan_key_unique UNIQUE (plan_id, key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON public.plan_features (plan_id);

COMMENT ON TABLE public.plan_features IS
  'Key/value feature flags and limits per plan (e.g. max_branches=3, tournaments_enabled=true).';


-- ---------------------------------------------------------------------------
-- 4) subscriptions — billing state per organization
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  plan_id                    UUID NOT NULL REFERENCES public.plans (id),
  provider                   TEXT NOT NULL DEFAULT 'internal',
  provider_subscription_id   TEXT,
  provider_customer_id       TEXT,
  status                     TEXT NOT NULL DEFAULT 'active',
  interval                   TEXT NOT NULL DEFAULT 'month',
  current_period_start       TIMESTAMPTZ,
  current_period_end         TIMESTAMPTZ,
  cancel_at_period_end       BOOLEAN NOT NULL DEFAULT false,
  trial_ends_at              TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused', 'internal')),
  CONSTRAINT subscriptions_provider_check
    CHECK (provider IN ('razorpay', 'stripe', 'internal', 'manual')),
  CONSTRAINT subscriptions_interval_check
    CHECK (interval IN ('month', 'year'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

COMMENT ON TABLE public.subscriptions IS
  'Current billing state per organization. Webhooks are the single writer for status.';


-- ---------------------------------------------------------------------------
-- 5) org_memberships — users ↔ organizations with role
-- ---------------------------------------------------------------------------
-- We reuse public.admin_users as the user identity (no change to that table
-- in Slice 0). Memberships attach each admin to one or more organizations
-- with a role. Today: everyone in admin_users is a member of Cuephoria.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  admin_user_id    UUID NOT NULL REFERENCES public.admin_users (id)   ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'staff',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_memberships_unique UNIQUE (organization_id, admin_user_id),
  CONSTRAINT org_memberships_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'read_only'))
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON public.org_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON public.org_memberships (admin_user_id);

COMMENT ON TABLE public.org_memberships IS
  'Join table connecting admin_users to organizations with a role. One user can belong to multiple orgs.';


-- ---------------------------------------------------------------------------
-- 6) platform_admins — Cuetronix operators (separate from tenant admin_users)
-- ---------------------------------------------------------------------------
-- Deliberately NOT reusing admin_users: platform admins operate the Cuetronix
-- SaaS itself (onboarding tenants, billing changes, support impersonation).
-- They must never accidentally act as a tenant user.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  display_name    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_admins_email_unique UNIQUE (email)
);

COMMENT ON TABLE public.platform_admins IS
  'Cuetronix platform operators. Authenticate at /app/platform. Never share session with tenant admin_users.';


-- ---------------------------------------------------------------------------
-- 7) audit_log — platform-level + sensitive-tenant event trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type        TEXT NOT NULL,
  actor_id          UUID,
  actor_label       TEXT,
  organization_id   UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  target_type       TEXT,
  target_id         TEXT,
  meta              JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_actor_type_check
    CHECK (actor_type IN ('platform_admin', 'admin_user', 'system', 'webhook', 'customer'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org ON public.audit_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);

COMMENT ON TABLE public.audit_log IS
  'Append-only event trail for platform-admin actions and sensitive tenant actions.';


-- ---------------------------------------------------------------------------
-- 8) Seed plans + plan_features (idempotent via ON CONFLICT on code)
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (code, name, is_public, price_inr_month, price_inr_year, sort_order)
VALUES
  ('internal',   'Internal (Cuephoria-owned)', false, NULL,  NULL,    0),
  ('starter',    'Starter',                    true,  1999,  19990,   10),
  ('growth',     'Growth',                     true,  4999,  49990,   20),
  ('pro',        'Pro',                        true,  9999,  99990,   30),
  ('enterprise', 'Enterprise',                 false, NULL,  NULL,    40)
ON CONFLICT (code) DO NOTHING;

-- Feature matrix. Keep numeric limits and boolean flags in one JSONB value.
-- Order: (plan_code, key, value)
WITH plan_ids AS (
  SELECT code, id FROM public.plans
)
INSERT INTO public.plan_features (plan_id, key, value)
SELECT p.id, f.key, f.value
FROM plan_ids p
JOIN (
  VALUES
    -- Internal (Cuephoria) — unlimited, everything on
    ('internal',   'max_branches',          '999'::jsonb),
    ('internal',   'max_stations',          '999'::jsonb),
    ('internal',   'max_admin_seats',       '999'::jsonb),
    ('internal',   'tournaments_enabled',   'true'::jsonb),
    ('internal',   'loyalty_enabled',       'true'::jsonb),
    ('internal',   'happy_hours_enabled',   'true'::jsonb),
    ('internal',   'memberships_enabled',   'true'::jsonb),
    ('internal',   'public_booking',        'true'::jsonb),
    ('internal',   'cafe_module',           'true'::jsonb),
    ('internal',   'exports_enabled',       'true'::jsonb),
    ('internal',   'custom_domain',         'true'::jsonb),
    ('internal',   'custom_font',           'true'::jsonb),
    ('internal',   'hide_powered_by',       'true'::jsonb),
    ('internal',   'custom_sms_sender',     'true'::jsonb),
    ('internal',   'priority_support',      'true'::jsonb),

    -- Starter (₹1,999/mo) — 1 branch, core POS + bookings + loyalty (basic)
    ('starter',    'max_branches',          '1'::jsonb),
    ('starter',    'max_stations',          '10'::jsonb),
    ('starter',    'max_admin_seats',       '3'::jsonb),
    ('starter',    'tournaments_enabled',   'false'::jsonb),
    ('starter',    'loyalty_enabled',       'true'::jsonb),
    ('starter',    'happy_hours_enabled',   'false'::jsonb),
    ('starter',    'memberships_enabled',   'false'::jsonb),
    ('starter',    'public_booking',        'true'::jsonb),
    ('starter',    'cafe_module',           'false'::jsonb),
    ('starter',    'exports_enabled',       'false'::jsonb),
    ('starter',    'custom_domain',         'false'::jsonb),
    ('starter',    'custom_font',           'false'::jsonb),
    ('starter',    'hide_powered_by',       'false'::jsonb),
    ('starter',    'custom_sms_sender',     'false'::jsonb),
    ('starter',    'priority_support',      'false'::jsonb),

    -- Growth (₹4,999/mo) — up to 3 branches, tournaments, exports
    ('growth',     'max_branches',          '3'::jsonb),
    ('growth',     'max_stations',          '25'::jsonb),
    ('growth',     'max_admin_seats',       '10'::jsonb),
    ('growth',     'tournaments_enabled',   'true'::jsonb),
    ('growth',     'loyalty_enabled',       'true'::jsonb),
    ('growth',     'happy_hours_enabled',   'true'::jsonb),
    ('growth',     'memberships_enabled',   'true'::jsonb),
    ('growth',     'public_booking',        'true'::jsonb),
    ('growth',     'cafe_module',           'false'::jsonb),
    ('growth',     'exports_enabled',       'true'::jsonb),
    ('growth',     'custom_domain',         'false'::jsonb),
    ('growth',     'custom_font',           'true'::jsonb),
    ('growth',     'hide_powered_by',       'false'::jsonb),
    ('growth',     'custom_sms_sender',     'false'::jsonb),
    ('growth',     'priority_support',      'false'::jsonb),

    -- Pro (₹9,999/mo) — up to 10 branches, custom domain, priority support
    ('pro',        'max_branches',          '10'::jsonb),
    ('pro',        'max_stations',          '999'::jsonb),
    ('pro',        'max_admin_seats',       '25'::jsonb),
    ('pro',        'tournaments_enabled',   'true'::jsonb),
    ('pro',        'loyalty_enabled',       'true'::jsonb),
    ('pro',        'happy_hours_enabled',   'true'::jsonb),
    ('pro',        'memberships_enabled',   'true'::jsonb),
    ('pro',        'public_booking',        'true'::jsonb),
    ('pro',        'cafe_module',           'false'::jsonb),
    ('pro',        'exports_enabled',       'true'::jsonb),
    ('pro',        'custom_domain',         'true'::jsonb),
    ('pro',        'custom_font',           'true'::jsonb),
    ('pro',        'hide_powered_by',       'false'::jsonb),
    ('pro',        'custom_sms_sender',     'true'::jsonb),
    ('pro',        'priority_support',      'true'::jsonb),

    -- Enterprise — quoted, full customization
    ('enterprise', 'max_branches',          '999'::jsonb),
    ('enterprise', 'max_stations',          '999'::jsonb),
    ('enterprise', 'max_admin_seats',       '999'::jsonb),
    ('enterprise', 'tournaments_enabled',   'true'::jsonb),
    ('enterprise', 'loyalty_enabled',       'true'::jsonb),
    ('enterprise', 'happy_hours_enabled',   'true'::jsonb),
    ('enterprise', 'memberships_enabled',   'true'::jsonb),
    ('enterprise', 'public_booking',        'true'::jsonb),
    ('enterprise', 'cafe_module',           'false'::jsonb),
    ('enterprise', 'exports_enabled',       'true'::jsonb),
    ('enterprise', 'custom_domain',         'true'::jsonb),
    ('enterprise', 'custom_font',           'true'::jsonb),
    ('enterprise', 'hide_powered_by',       'true'::jsonb),
    ('enterprise', 'custom_sms_sender',     'true'::jsonb),
    ('enterprise', 'priority_support',      'true'::jsonb)
) AS f(plan_code, key, value) ON f.plan_code = p.code
ON CONFLICT (plan_id, key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 9) Seed Cuephoria as organization #1 with internal plan + active subscription
-- ---------------------------------------------------------------------------
INSERT INTO public.organizations
  (slug, name, legal_name, country, currency, timezone, status, is_internal)
VALUES
  ('cuephoria', 'Cuephoria', 'Cuephoria Gaming Lounge', 'IN', 'INR', 'Asia/Kolkata', 'active', true)
ON CONFLICT (slug) DO NOTHING;

-- Create an internal subscription row for Cuephoria so the rest of the stack
-- always finds one. status='internal' is a reserved value that never expires.
INSERT INTO public.subscriptions (organization_id, plan_id, provider, status, interval)
SELECT
  o.id,
  (SELECT id FROM public.plans WHERE code = 'internal' LIMIT 1),
  'internal',
  'internal',
  'year'
FROM public.organizations o
WHERE o.slug = 'cuephoria'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.organization_id = o.id
  );


-- ---------------------------------------------------------------------------
-- 10) Attach organization_id to locations (parent of all tenant data)
-- ---------------------------------------------------------------------------
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);

UPDATE public.locations
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'cuephoria' LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE public.locations
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON public.locations (organization_id);


-- ---------------------------------------------------------------------------
-- 11) Backfill org_memberships from admin_users
--     - super admins → role = 'owner'
--     - is_admin=true & not super → role = 'admin'
--     - others → role = 'staff'
-- ---------------------------------------------------------------------------
INSERT INTO public.org_memberships (organization_id, admin_user_id, role)
SELECT
  o.id,
  au.id,
  CASE
    WHEN COALESCE(au.is_super_admin, false) THEN 'owner'
    WHEN COALESCE(au.is_admin, false)        THEN 'admin'
    ELSE                                           'staff'
  END AS role
FROM public.admin_users au
CROSS JOIN public.organizations o
WHERE o.slug = 'cuephoria'
ON CONFLICT (organization_id, admin_user_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 12) Attach organization_id to hot operational tables
--
-- Every table below already has location_id (see 20260409120000_multi_location_core).
-- We derive organization_id from locations.organization_id and set NOT NULL in
-- the same statement block. Covered:
--   - stations, categories, products
--   - customers
--   - bills, bill_items
--   - bookings, sessions
--
-- Other location-scoped tables (expenses, cash_*, tournaments, rewards, etc.)
-- will get organization_id added in Slice 1 when RLS is enabled, to keep this
-- migration's blast radius contained. They remain correctly scoped via
-- location_id → locations.organization_id in the meantime.
-- ---------------------------------------------------------------------------

-- Helper expression: default org id = whatever org the row's location_id belongs to.
-- Pulled via UPDATE ... FROM so we don't scan locations multiple times.

-- 12a) stations
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.stations s
SET organization_id = l.organization_id
FROM public.locations l
WHERE s.location_id = l.id AND s.organization_id IS NULL;
ALTER TABLE public.stations ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stations_organization_id ON public.stations (organization_id);

-- 12b) categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.categories c
SET organization_id = l.organization_id
FROM public.locations l
WHERE c.location_id = l.id AND c.organization_id IS NULL;
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON public.categories (organization_id);

-- 12c) products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.products p
SET organization_id = l.organization_id
FROM public.locations l
WHERE p.location_id = l.id AND p.organization_id IS NULL;
ALTER TABLE public.products ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products (organization_id);

-- 12d) customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.customers c
SET organization_id = l.organization_id
FROM public.locations l
WHERE c.location_id = l.id AND c.organization_id IS NULL;
ALTER TABLE public.customers ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);

-- 12e) bills
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.bills b
SET organization_id = l.organization_id
FROM public.locations l
WHERE b.location_id = l.id AND b.organization_id IS NULL;
ALTER TABLE public.bills ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_organization_id ON public.bills (organization_id);

-- 12f) bill_items
ALTER TABLE public.bill_items
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.bill_items bi
SET organization_id = l.organization_id
FROM public.locations l
WHERE bi.location_id = l.id AND bi.organization_id IS NULL;
ALTER TABLE public.bill_items ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bill_items_organization_id ON public.bill_items (organization_id);

-- 12g) bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.bookings b
SET organization_id = l.organization_id
FROM public.locations l
WHERE b.location_id = l.id AND b.organization_id IS NULL;
ALTER TABLE public.bookings ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_organization_id ON public.bookings (organization_id);

-- 12h) sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations (id);
UPDATE public.sessions s
SET organization_id = l.organization_id
FROM public.locations l
WHERE s.location_id = l.id AND s.organization_id IS NULL;
ALTER TABLE public.sessions ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON public.sessions (organization_id);


-- ---------------------------------------------------------------------------
-- 13) updated_at triggers for new tables that have updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenancy_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_touch_updated_at ON public.organizations;
CREATE TRIGGER organizations_touch_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.tenancy_touch_updated_at();

DROP TRIGGER IF EXISTS subscriptions_touch_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_touch_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tenancy_touch_updated_at();


-- ---------------------------------------------------------------------------
-- 14) Record the migration in audit_log for platform traceability
-- ---------------------------------------------------------------------------
INSERT INTO public.audit_log (actor_type, actor_label, organization_id, action, meta)
SELECT
  'system',
  'slice_0_migration',
  o.id,
  'slice_0.applied',
  jsonb_build_object(
    'description', 'Multi-tenant foundation applied. Cuephoria seeded on internal plan. No behavior change.',
    'migration', '20260421100000_slice0_multi_tenant_foundation',
    'schema_version', 'slice_0'
  )
FROM public.organizations o
WHERE o.slug = 'cuephoria'
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_log al
    WHERE al.action = 'slice_0.applied' AND al.organization_id = o.id
  );


-- ============================================================================
-- End of Slice 0. No RLS enabled, no endpoint behavior changes, no data
-- destroyed. Cuephoria is now organization_id #1 on an internal plan.
-- Next: Slice 1 introduces withOrgContext at the API layer (feature-flagged).
-- ============================================================================
