-- Pricing reset (2026-06):
-- - Starter below INR 1,000
-- - Pro capped below INR 4,000/month
-- - Stronger feature gating to drive Growth/Pro upgrades

UPDATE public.plans
SET
  price_inr_month = CASE code
    WHEN 'starter' THEN 999
    WHEN 'growth' THEN 2499
    WHEN 'pro' THEN 3999
    ELSE price_inr_month
  END,
  price_inr_year = CASE code
    WHEN 'starter' THEN 9588
    WHEN 'growth' THEN 23988
    WHEN 'pro' THEN 38388
    ELSE price_inr_year
  END
WHERE code IN ('starter', 'growth', 'pro');

WITH plan_ids AS (
  SELECT id, code
  FROM public.plans
  WHERE code IN ('starter', 'growth', 'pro')
)
INSERT INTO public.plan_features (plan_id, key, value)
SELECT
  p.id,
  v.key,
  v.value
FROM plan_ids p
JOIN (
  VALUES
    -- Starter: essentials only
    ('starter', 'max_branches',        '1'::jsonb),
    ('starter', 'max_stations',        '6'::jsonb),
    ('starter', 'max_admin_seats',     '1'::jsonb),
    ('starter', 'tournaments_enabled', 'false'::jsonb),
    ('starter', 'loyalty_enabled',     'false'::jsonb),
    ('starter', 'memberships_enabled', 'false'::jsonb),
    ('starter', 'public_booking',      'false'::jsonb),
    ('starter', 'priority_support',    'false'::jsonb),

    -- Growth: strong single-branch operating tier
    ('growth', 'max_branches',        '1'::jsonb),
    ('growth', 'max_stations',        '20'::jsonb),
    ('growth', 'max_admin_seats',     '5'::jsonb),
    ('growth', 'tournaments_enabled', 'true'::jsonb),
    ('growth', 'loyalty_enabled',     'true'::jsonb),
    ('growth', 'memberships_enabled', 'true'::jsonb),
    ('growth', 'public_booking',      'true'::jsonb),
    ('growth', 'priority_support',    'true'::jsonb),

    -- Pro: advanced operations with expanded limits
    ('pro', 'max_branches',        '3'::jsonb),
    ('pro', 'max_stations',        '999'::jsonb),
    ('pro', 'max_admin_seats',     '999'::jsonb),
    ('pro', 'tournaments_enabled', 'true'::jsonb),
    ('pro', 'loyalty_enabled',     'true'::jsonb),
    ('pro', 'memberships_enabled', 'true'::jsonb),
    ('pro', 'public_booking',      'true'::jsonb),
    ('pro', 'priority_support',    'true'::jsonb)
) AS v(plan_code, key, value)
  ON v.plan_code = p.code
ON CONFLICT (plan_id, key)
DO UPDATE SET value = EXCLUDED.value;
