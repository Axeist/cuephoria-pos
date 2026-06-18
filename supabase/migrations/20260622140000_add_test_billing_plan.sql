-- ₹1 Razorpay test plan for subscription billing flow verification.
-- Disabled by default; enable from Platform → Plans.
INSERT INTO public.plans (
  code,
  name,
  description,
  is_public,
  is_active,
  price_inr_month,
  price_inr_year,
  razorpay_plan_id_month,
  sort_order
)
VALUES (
  'test',
  'Test Plan',
  'Low-amount Razorpay test plan for verifying checkout, webhooks, and access unlock.',
  false,
  false,
  1,
  NULL,
  'plan_SsPPpQq6QkscZ0',
  5
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_inr_month = EXCLUDED.price_inr_month,
  razorpay_plan_id_month = COALESCE(public.plans.razorpay_plan_id_month, EXCLUDED.razorpay_plan_id_month);

-- Mirror starter limits so test subscriptions behave like a real tenant plan.
INSERT INTO public.plan_features (plan_id, key, value)
SELECT tp.id, sf.key, sf.value
FROM public.plans tp
JOIN public.plans sp ON sp.code = 'starter'
JOIN public.plan_features sf ON sf.plan_id = sp.id
WHERE tp.code = 'test'
ON CONFLICT (plan_id, key) DO NOTHING;
