-- Populate Razorpay plan IDs for Starter/Growth/Pro after the 2026-06 pricing reset.
-- Source IDs captured from Razorpay dashboard plan list.

WITH mapped(code, month_id, year_id) AS (
  VALUES
    ('starter', 'plan_Sgv4Knhcim84RG', 'plan_Sgv5bdzRVQugKH'),
    ('growth',  'plan_Sgv6iD6Esj4fum', 'plan_Sgv7WUrMyW2IZP'),
    ('pro',     'plan_Sgv8HNowVGru5I', 'plan_SgvBvbTUhUI9JI')
)
UPDATE public.plans p
SET
  razorpay_plan_id_month = m.month_id,
  razorpay_plan_id_year = m.year_id
FROM mapped m
WHERE p.code = m.code;

