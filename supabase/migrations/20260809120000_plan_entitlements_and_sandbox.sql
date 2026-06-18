-- Plan entitlements (bookings + staff gates) and demo sandbox workspaces.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sandbox_seeded_at timestamptz NULL;

COMMENT ON COLUMN public.organizations.is_sandbox IS
  'Demo/sales sandbox — bypasses Razorpay billing; plan switches allowed without payment.';

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_sandbox_user boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.admin_users.is_sandbox_user IS
  'Prospect login for a sandbox workspace; hidden from tenant user management.';

CREATE TABLE IF NOT EXISTS public.sandbox_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  created_by_platform_admin_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sandbox_grants_org ON public.sandbox_access_grants (organization_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_grants_expires ON public.sandbox_access_grants (expires_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_grants_email ON public.sandbox_access_grants (lower(client_email));

ALTER TABLE public.sandbox_access_grants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Canonical plan_features matrix (upsert all keys per tier)
-- ---------------------------------------------------------------------------

WITH plan_ids AS (SELECT code, id FROM public.plans)
INSERT INTO public.plan_features (plan_id, key, value)
SELECT p.id, f.key, f.value::jsonb
FROM plan_ids p
JOIN (
  VALUES
    ('starter', 'bookings_enabled', 'false'),
    ('starter', 'staff_hr_enabled', 'false'),
    ('starter', 'advanced_analytics_enabled', 'false'),
    ('starter', 'premium_modules_enabled', 'false'),
    ('starter', 'max_branches', '1'),
    ('starter', 'max_stations', '6'),
    ('starter', 'max_admin_seats', '1'),
    ('starter', 'tournaments_enabled', 'false'),
    ('starter', 'loyalty_enabled', 'false'),
    ('starter', 'happy_hours_enabled', 'false'),
    ('starter', 'memberships_enabled', 'false'),
    ('starter', 'public_booking', 'false'),
    ('starter', 'cafe_module', 'false'),
    ('starter', 'exports_enabled', 'false'),
    ('starter', 'custom_domain', 'false'),
    ('starter', 'custom_font', 'false'),
    ('starter', 'hide_powered_by', 'false'),
    ('starter', 'custom_sms_sender', 'false'),
    ('starter', 'priority_support', 'false'),

    ('growth', 'bookings_enabled', 'true'),
    ('growth', 'staff_hr_enabled', 'false'),
    ('growth', 'advanced_analytics_enabled', 'false'),
    ('growth', 'premium_modules_enabled', 'false'),
    ('growth', 'max_branches', '1'),
    ('growth', 'max_stations', '20'),
    ('growth', 'max_admin_seats', '5'),
    ('growth', 'tournaments_enabled', 'true'),
    ('growth', 'loyalty_enabled', 'true'),
    ('growth', 'happy_hours_enabled', 'true'),
    ('growth', 'memberships_enabled', 'true'),
    ('growth', 'public_booking', 'true'),
    ('growth', 'cafe_module', 'false'),
    ('growth', 'exports_enabled', 'true'),
    ('growth', 'custom_domain', 'false'),
    ('growth', 'custom_font', 'true'),
    ('growth', 'hide_powered_by', 'false'),
    ('growth', 'custom_sms_sender', 'false'),
    ('growth', 'priority_support', 'true'),

    ('pro', 'bookings_enabled', 'true'),
    ('pro', 'staff_hr_enabled', 'true'),
    ('pro', 'advanced_analytics_enabled', 'true'),
    ('pro', 'premium_modules_enabled', 'false'),
    ('pro', 'max_branches', '3'),
    ('pro', 'max_stations', '999'),
    ('pro', 'max_admin_seats', '999'),
    ('pro', 'tournaments_enabled', 'true'),
    ('pro', 'loyalty_enabled', 'true'),
    ('pro', 'happy_hours_enabled', 'true'),
    ('pro', 'memberships_enabled', 'true'),
    ('pro', 'public_booking', 'true'),
    ('pro', 'cafe_module', 'false'),
    ('pro', 'exports_enabled', 'true'),
    ('pro', 'custom_domain', 'true'),
    ('pro', 'custom_font', 'true'),
    ('pro', 'hide_powered_by', 'true'),
    ('pro', 'custom_sms_sender', 'true'),
    ('pro', 'priority_support', 'true'),

    ('enterprise', 'bookings_enabled', 'true'),
    ('enterprise', 'staff_hr_enabled', 'true'),
    ('enterprise', 'advanced_analytics_enabled', 'true'),
    ('enterprise', 'premium_modules_enabled', 'true'),
    ('enterprise', 'max_branches', '999'),
    ('enterprise', 'max_stations', '999'),
    ('enterprise', 'max_admin_seats', '999'),
    ('enterprise', 'tournaments_enabled', 'true'),
    ('enterprise', 'loyalty_enabled', 'true'),
    ('enterprise', 'happy_hours_enabled', 'true'),
    ('enterprise', 'memberships_enabled', 'true'),
    ('enterprise', 'public_booking', 'true'),
    ('enterprise', 'cafe_module', 'true'),
    ('enterprise', 'exports_enabled', 'true'),
    ('enterprise', 'custom_domain', 'true'),
    ('enterprise', 'custom_font', 'true'),
    ('enterprise', 'hide_powered_by', 'true'),
    ('enterprise', 'custom_sms_sender', 'true'),
    ('enterprise', 'priority_support', 'true'),

    ('internal', 'bookings_enabled', 'true'),
    ('internal', 'staff_hr_enabled', 'true'),
    ('internal', 'advanced_analytics_enabled', 'true'),
    ('internal', 'premium_modules_enabled', 'true'),
    ('internal', 'max_branches', '999'),
    ('internal', 'max_stations', '999'),
    ('internal', 'max_admin_seats', '999'),
    ('internal', 'tournaments_enabled', 'true'),
    ('internal', 'loyalty_enabled', 'true'),
    ('internal', 'happy_hours_enabled', 'true'),
    ('internal', 'memberships_enabled', 'true'),
    ('internal', 'public_booking', 'true'),
    ('internal', 'cafe_module', 'true'),
    ('internal', 'exports_enabled', 'true'),
    ('internal', 'custom_domain', 'true'),
    ('internal', 'custom_font', 'true'),
    ('internal', 'hide_powered_by', 'true'),
    ('internal', 'custom_sms_sender', 'true'),
    ('internal', 'priority_support', 'true'),

    ('test', 'bookings_enabled', 'false'),
    ('test', 'staff_hr_enabled', 'false'),
    ('test', 'advanced_analytics_enabled', 'false'),
    ('test', 'premium_modules_enabled', 'false')
) AS f(plan_code, key, value) ON f.plan_code = p.code
ON CONFLICT (plan_id, key) DO UPDATE SET value = EXCLUDED.value;
