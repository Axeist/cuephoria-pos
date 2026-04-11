-- Default: public booking and online payment enabled per branch (main, lite, …)

INSERT INTO public.booking_settings (setting_key, setting_value, description, location_id)
SELECT
  'public_booking_enabled',
  'true'::jsonb,
  'When false, the public booking page shows an unavailable message for this branch.',
  l.id
FROM public.locations l
ON CONFLICT (location_id, setting_key) DO NOTHING;

INSERT INTO public.booking_settings (setting_key, setting_value, description, location_id)
SELECT
  'online_payment_enabled',
  'true'::jsonb,
  'When false, public booking hides Razorpay and only allows pay-at-venue.',
  l.id
FROM public.locations l
ON CONFLICT (location_id, setting_key) DO NOTHING;
