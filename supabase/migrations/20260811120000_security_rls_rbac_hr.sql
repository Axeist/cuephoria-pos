-- Lock down workspace RBAC tables (server uses service role; client never queries these).
-- Rollback: DROP POLICY ... ; ALTER TABLE ... DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_permission_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_permission_keys_deny_all ON public.workspace_permission_keys;
CREATE POLICY workspace_permission_keys_deny_all ON public.workspace_permission_keys
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS workspace_roles_deny_all ON public.workspace_roles;
CREATE POLICY workspace_roles_deny_all ON public.workspace_roles
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS workspace_role_permissions_deny_all ON public.workspace_role_permissions;
CREATE POLICY workspace_role_permissions_deny_all ON public.workspace_role_permissions
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS admin_user_roles_deny_all ON public.admin_user_roles;
CREATE POLICY admin_user_roles_deny_all ON public.admin_user_roles
  FOR ALL USING (false) WITH CHECK (false);

-- Staff HR RLS deferred: HR UI still reads via browser anon client.
-- Apply staff_* deny-all only after /api/admin/staff-* proxies exist (Phase 1b).
