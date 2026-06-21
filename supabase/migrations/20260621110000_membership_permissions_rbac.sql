-- Membership module RBAC permissions
-- Rollback:
--   DELETE FROM public.workspace_role_permissions WHERE permission_key LIKE 'memberships.%';
--   DELETE FROM public.workspace_permission_keys WHERE key LIKE 'memberships.%';

INSERT INTO public.workspace_permission_keys (key, group_label, label) VALUES
  ('memberships.view', 'Memberships', 'View memberships hub'),
  ('memberships.tiers.edit', 'Memberships', 'Manage tier plans'),
  ('memberships.recharge.edit', 'Memberships', 'Manage recharge tiers'),
  ('memberships.recharge.execute', 'Memberships', 'Execute recharges'),
  ('memberships.cards.manage', 'Memberships', 'Manage NFC cards'),
  ('memberships.coupons.edit', 'Memberships', 'Manage member coupons'),
  ('memberships.settings.edit', 'Memberships', 'Membership settings & feature flags'),
  ('memberships.customers.edit', 'Memberships', 'Edit member profiles')
ON CONFLICT (key) DO UPDATE
SET group_label = EXCLUDED.group_label,
    label = EXCLUDED.label;

-- Legacy customers.membership_edit → memberships.customers.edit + view
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT DISTINCT rp.role_id, k.key
FROM public.workspace_role_permissions rp
CROSS JOIN (VALUES ('memberships.view'), ('memberships.customers.edit')) AS k(key)
WHERE rp.permission_key = 'customers.membership_edit'
ON CONFLICT DO NOTHING;

-- Owner: all membership keys
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, pk.key
FROM public.workspace_roles wr
CROSS JOIN public.workspace_permission_keys pk
WHERE wr.slug = 'owner'
  AND pk.key LIKE 'memberships.%'
ON CONFLICT DO NOTHING;

-- Venue admin: all
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, pk.key
FROM public.workspace_roles wr
CROSS JOIN public.workspace_permission_keys pk
WHERE wr.slug = 'venue_admin'
  AND pk.key LIKE 'memberships.%'
ON CONFLICT DO NOTHING;

-- Shift manager: view + recharge execute + cards manage
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, k.key
FROM public.workspace_roles wr
CROSS JOIN (
  VALUES
    ('memberships.view'),
    ('memberships.recharge.execute'),
    ('memberships.cards.manage')
) AS k(key)
WHERE wr.slug = 'shift_manager'
ON CONFLICT DO NOTHING;

-- Employee: view only
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, 'memberships.view'
FROM public.workspace_roles wr
WHERE wr.slug = 'employee'
ON CONFLICT DO NOTHING;

-- Accountant: view only
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, 'memberships.view'
FROM public.workspace_roles wr
WHERE wr.slug = 'accountant'
ON CONFLICT DO NOTHING;
