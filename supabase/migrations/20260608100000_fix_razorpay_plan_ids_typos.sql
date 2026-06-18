-- Correct typos in Razorpay plan IDs introduced by
-- 20260601100000_populate_razorpay_plan_ids_from_2026_pricing.sql.
--
-- Authoritative source: Razorpay dashboard (apriltop screenshot 2026-04-23).
-- Three IDs were captured incorrectly:
--   starter year:  plan_Sgv5bdzRVQugKH (cap V)   → plan_Sgv5bdzRvQugKH (lower v)
--   pro month:     plan_Sgv8HNowVGru5I (N)       → plan_Sgv8HWowVGru5I (W)
--   pro year:      plan_SgvBvbTUhUI9JI (Bvb)     → plan_Sgv8wbTUhUI9JI (8wb)
--
-- Without this fix every "Subscribe" call returns Razorpay 400 "Plan not found"
-- and the tenant billing page shows a generic 502 failure.

WITH mapped(code, month_id, year_id) AS (
  VALUES
    ('starter', 'plan_Sgv4Knhcim84RG', 'plan_Sgv5bdzRvQugKH'),
    ('growth',  'plan_Sgv6iD6Esj4fum', 'plan_Sgv7WUrMyW2IZP'),
    ('pro',     'plan_Sgv8HWowVGru5I', 'plan_Sgv8wbTUhUI9JI')
)
UPDATE public.plans p
SET
  razorpay_plan_id_month = m.month_id,
  razorpay_plan_id_year = m.year_id
FROM mapped m
WHERE p.code = m.code;
