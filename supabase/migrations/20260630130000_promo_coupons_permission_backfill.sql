-- coupons.manage permission + backfill booking_settings JSON into promo_coupons
-- Rollback:
--   DELETE FROM public.workspace_role_permissions WHERE permission_key = 'coupons.manage';
--   DELETE FROM public.workspace_permission_keys WHERE key = 'coupons.manage';

INSERT INTO public.workspace_permission_keys (key, group_label, label) VALUES
  ('coupons.manage', 'Coupons', 'Manage promo coupons')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT r.id, 'coupons.manage'
FROM public.workspace_roles r
WHERE r.slug IN ('owner', 'venue_admin')
ON CONFLICT DO NOTHING;

-- Backfill generic coupons from booking_settings.booking_coupons JSON
INSERT INTO public.promo_coupons (
  organization_id,
  location_id,
  code,
  description,
  enabled,
  discount_type,
  discount_value,
  discount_scope,
  channels,
  allows_online_payment,
  allows_venue_payment,
  created_at,
  updated_at
)
SELECT
  l.organization_id,
  bs.location_id,
  upper(trim(elem->>'code')),
  coalesce(nullif(trim(elem->>'description'), ''), 'Booking coupon'),
  coalesce((elem->>'enabled')::boolean, true),
  CASE WHEN elem->>'discount_type' = 'fixed' THEN 'fixed' ELSE 'percentage' END,
  coalesce((elem->>'discount_value')::numeric, 0),
  'whole_booking',
  ARRAY['public_booking', 'pos_session']::TEXT[],
  true,
  false,
  now(),
  now()
FROM public.booking_settings bs
JOIN public.locations l ON l.id = bs.location_id
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(bs.setting_value) = 'array' THEN bs.setting_value
    ELSE '[]'::jsonb
  END
) AS elem
WHERE bs.setting_key = 'booking_coupons'
  AND trim(coalesce(elem->>'code', '')) <> ''
ON CONFLICT (organization_id, code) DO NOTHING;
