-- Repair accounts that have branch assignments (admin_user_locations → locations)
-- but no org_memberships row. Without membership, tenant login rejects with
-- "No active workspace access" even though the UI showed branches.
--
-- Idempotent: skips pairs that already exist.

INSERT INTO public.org_memberships (organization_id, admin_user_id, role)
SELECT DISTINCT
  l.organization_id,
  aul.admin_user_id,
  CASE
    WHEN au.is_super_admin IS TRUE OR au.is_admin IS TRUE THEN 'admin'::text
    ELSE 'staff'::text
  END
FROM public.admin_user_locations aul
JOIN public.locations l ON l.id = aul.location_id
JOIN public.admin_users au ON au.id = aul.admin_user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.org_memberships m
  WHERE m.organization_id = l.organization_id
    AND m.admin_user_id = aul.admin_user_id
)
ON CONFLICT (organization_id, admin_user_id) DO NOTHING;
