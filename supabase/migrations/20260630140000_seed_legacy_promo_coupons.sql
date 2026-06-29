-- Seed former hardcoded public-booking / POS coupons into promo_coupons (per org).
-- Rollback: DELETE FROM public.promo_coupons WHERE code IN ('HH99','NIT35','CUEPHORIA20','CUEPHORIA35','AAVEG50');

INSERT INTO public.promo_coupons (
  organization_id, code, description, enabled, discount_type, discount_value,
  discount_scope, channels, customer_groups, allows_online_payment, allows_venue_payment,
  eligibility_rules, gates, stackable, emoji, success_message, sort_order
)
SELECT
  o.id,
  v.code,
  v.description,
  true,
  v.discount_type,
  v.discount_value,
  v.discount_scope,
  v.channels::TEXT[],
  ARRAY['all']::TEXT[],
  true,
  false,
  v.eligibility_rules::jsonb,
  v.gates::jsonb,
  v.stackable,
  v.emoji,
  v.success_message,
  v.sort_order
FROM public.organizations o
CROSS JOIN (
  VALUES
    (
      'HH99',
      'Happy hour flat rate — PS5 & 8-Ball Mon–Fri 11 AM–4 PM',
      'flat_rate',
      99,
      'per_station_type',
      ARRAY['public_booking','pos_session'],
      '{"daysOfWeek":[1,2,3,4,5],"timeRange":{"start":"11:00","end":"16:00"},"timeMatchMode":"all_slots","stationTypes":["ps5","8ball"],"excludeStationTypes":["vr"]}',
      '{}',
      true,
      '⏰',
      '⏰ HH99 applied! PS5 & 8-Ball stations at ₹99/hour during Happy Hours! ✨',
      10
    ),
    (
      'NIT35',
      '35% off PS5, 8-Ball, VR & sim racing for NIT students',
      'percentage',
      35,
      'per_station_type',
      ARRAY['public_booking','pos_session'],
      '{"stationTypes":["ps5","8ball","vr"]}',
      '{"requireInstagramFollow":true}',
      true,
      '🎓',
      '🎓 NIT35 applied! 35% OFF on eligible stations!',
      20
    ),
    (
      'CUEPHORIA20',
      '20% off entire booking',
      'percentage',
      20,
      'whole_booking',
      ARRAY['public_booking'],
      '{}',
      '{"requireInstagramFollow":true}',
      false,
      '🎉',
      '🎉 CUEPHORIA20 applied: 20% OFF! Book more, play more! 🕹️',
      30
    ),
    (
      'CUEPHORIA35',
      '35% off for students with valid ID',
      'percentage',
      35,
      'whole_booking',
      ARRAY['public_booking'],
      '{}',
      '{"requireStudentConfirm":true,"requireInstagramFollow":true}',
      false,
      '📚',
      '📚 CUEPHORIA35 applied: 35% OFF for students with valid ID!',
      40
    ),
    (
      'AAVEG50',
      '50% off PS5, 8-Ball, VR & sim racing',
      'percentage',
      50,
      'per_station_type',
      ARRAY['public_booking','pos_session'],
      '{"stationTypes":["ps5","8ball","vr"]}',
      '{}',
      false,
      '🏫',
      '🏫 AAVEG50 applied! 50% OFF on eligible stations!',
      50
    )
) AS v(
  code, description, discount_type, discount_value, discount_scope, channels,
  eligibility_rules, gates, stackable, emoji, success_message, sort_order
)
ON CONFLICT (organization_id, code) DO NOTHING;
