-- Tournament permissions: dedicated RBAC group (granular keys + legacy alias soak)
-- Rollback:
--   DELETE FROM public.workspace_role_permissions WHERE permission_key LIKE 'tournaments.%';
--   DELETE FROM public.workspace_permission_keys WHERE key LIKE 'tournaments.%';

INSERT INTO public.workspace_permission_keys (key, group_label, label) VALUES
  ('tournaments.view', 'Tournaments', 'View tournaments & TV boards'),
  ('tournaments.create', 'Tournaments', 'Create tournaments'),
  ('tournaments.edit', 'Tournaments', 'Edit events, players & fixtures'),
  ('tournaments.results', 'Tournaments', 'Record match results & lap times'),
  ('tournaments.complete', 'Tournaments', 'Mark complete / reopen events'),
  ('tournaments.delete', 'Tournaments', 'Delete tournaments'),
  ('tournaments.gallery', 'Tournaments', 'Manage gallery & photos'),
  ('tournaments.leaderboard.reset', 'Tournaments', 'Reset leaderboard')
ON CONFLICT (key) DO UPDATE
SET group_label = EXCLUDED.group_label,
    label = EXCLUDED.label;

-- view: legacy settings.tournaments.view
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT DISTINCT rp.role_id, 'tournaments.view'
FROM public.workspace_role_permissions rp
WHERE rp.permission_key = 'settings.tournaments.view'
ON CONFLICT DO NOTHING;

-- write bundle: legacy settings.tournaments.manage
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT DISTINCT rp.role_id, k.key
FROM public.workspace_role_permissions rp
CROSS JOIN (
  VALUES
    ('tournaments.create'),
    ('tournaments.edit'),
    ('tournaments.results'),
    ('tournaments.complete'),
    ('tournaments.delete'),
    ('tournaments.gallery')
) AS k(key)
WHERE rp.permission_key = 'settings.tournaments.manage'
ON CONFLICT DO NOTHING;

-- leaderboard reset: legacy settings.leaderboard.reset
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT DISTINCT rp.role_id, 'tournaments.leaderboard.reset'
FROM public.workspace_role_permissions rp
WHERE rp.permission_key = 'settings.leaderboard.reset'
ON CONFLICT DO NOTHING;

-- Owner roles: grant all new tournament keys
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, pk.key
FROM public.workspace_roles wr
CROSS JOIN public.workspace_permission_keys pk
WHERE wr.slug = 'owner'
  AND pk.key LIKE 'tournaments.%'
ON CONFLICT DO NOTHING;

-- Venue admin: full tournament access
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, pk.key
FROM public.workspace_roles wr
CROSS JOIN public.workspace_permission_keys pk
WHERE wr.slug = 'venue_admin'
  AND pk.key LIKE 'tournaments.%'
ON CONFLICT DO NOTHING;

-- Shift manager: view, results, complete, reset
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, k.key
FROM public.workspace_roles wr
CROSS JOIN (
  VALUES
    ('tournaments.view'),
    ('tournaments.results'),
    ('tournaments.complete'),
    ('tournaments.leaderboard.reset')
) AS k(key)
WHERE wr.slug = 'shift_manager'
ON CONFLICT DO NOTHING;

-- Employee: view only
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, 'tournaments.view'
FROM public.workspace_roles wr
WHERE wr.slug = 'employee'
ON CONFLICT DO NOTHING;

-- Accountant: view only
INSERT INTO public.workspace_role_permissions (role_id, permission_key)
SELECT wr.id, 'tournaments.view'
FROM public.workspace_roles wr
WHERE wr.slug = 'accountant'
ON CONFLICT DO NOTHING;
