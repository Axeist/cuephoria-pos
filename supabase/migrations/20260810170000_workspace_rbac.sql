-- Workspace RBAC: permission catalog, org roles, assignments, seed + backfill.

CREATE TABLE IF NOT EXISTS public.workspace_permission_keys (
  key TEXT PRIMARY KEY,
  group_label TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  requires_plan TEXT
);

CREATE TABLE IF NOT EXISTS public.workspace_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name),
  UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workspace_role_permissions (
  role_id UUID NOT NULL REFERENCES public.workspace_roles (id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.workspace_permission_keys (key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  admin_user_id UUID PRIMARY KEY REFERENCES public.admin_users (id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.workspace_roles (id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.admin_users (id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_roles_org ON public.workspace_roles (organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON public.admin_user_roles (role_id);

-- ── Seed permission keys (idempotent) ─────────────────────────────────────────
INSERT INTO public.workspace_permission_keys (key, group_label, label) VALUES
  ('dashboard.view', 'Dashboard', 'View dashboard'),
  ('dashboard.analytics.view', 'Dashboard', 'View analytics'),
  ('dashboard.expenses.view', 'Dashboard', 'View expenses'),
  ('dashboard.expenses.edit', 'Dashboard', 'Edit expenses'),
  ('dashboard.expenses.delete', 'Dashboard', 'Delete expenses'),
  ('dashboard.vault.view', 'Dashboard', 'View vault'),
  ('dashboard.vault.deposit', 'Dashboard', 'Vault deposits'),
  ('dashboard.vault.withdraw', 'Dashboard', 'Vault withdrawals'),
  ('pos.view', 'POS', 'View POS'),
  ('pos.checkout', 'POS', 'Checkout & bill'),
  ('pos.discount', 'POS', 'Apply discounts'),
  ('pos.void_bill', 'POS', 'Void bills'),
  ('pos.late_night_override', 'POS', 'Late-night rate override'),
  ('pos.credit_sale', 'POS', 'Credit sales'),
  ('stations.view', 'Gaming Stations', 'View stations'),
  ('stations.start_session', 'Gaming Stations', 'Start sessions'),
  ('stations.end_session', 'Gaming Stations', 'End sessions'),
  ('stations.pause', 'Gaming Stations', 'Pause sessions'),
  ('stations.multi_start', 'Gaming Stations', 'Multi-start sessions'),
  ('stations.configure', 'Gaming Stations', 'Configure stations'),
  ('stations.maintenance', 'Gaming Stations', 'Maintenance mode'),
  ('products.view', 'Products', 'View products'),
  ('products.create', 'Products', 'Create products'),
  ('products.edit', 'Products', 'Edit products'),
  ('products.delete', 'Products', 'Delete products'),
  ('products.stock_adjust', 'Products', 'Adjust stock'),
  ('customers.view', 'Customers', 'View customers'),
  ('customers.create', 'Customers', 'Create customers'),
  ('customers.edit', 'Customers', 'Edit customers'),
  ('customers.delete', 'Customers', 'Delete customers'),
  ('customers.export', 'Customers', 'Export customers'),
  ('customers.membership_edit', 'Customers', 'Edit memberships'),
  ('reports.view', 'Reports', 'View reports'),
  ('reports.bills', 'Reports', 'Bills tab'),
  ('reports.sessions', 'Reports', 'Sessions tab'),
  ('reports.customers', 'Reports', 'Customers tab'),
  ('reports.summary', 'Reports', 'Summary tab'),
  ('reports.export', 'Reports', 'Export reports'),
  ('reports.delete_record', 'Reports', 'Delete report records'),
  ('bookings.view', 'Bookings', 'View bookings'),
  ('bookings.create', 'Bookings', 'Create bookings'),
  ('bookings.edit', 'Bookings', 'Edit bookings'),
  ('bookings.cancel', 'Bookings', 'Cancel bookings'),
  ('bookings.check_in', 'Bookings', 'Check in bookings'),
  ('bookings.reconciliation', 'Bookings', 'Reconciliation'),
  ('bookings.coupons_manage', 'Bookings', 'Manage coupons'),
  ('bookings.slots_configure', 'Bookings', 'Configure slots'),
  ('bookings.popups_manage', 'Bookings', 'Manage popups'),
  ('settings.general.view', 'Settings', 'View general settings'),
  ('settings.general.edit', 'Settings', 'Edit general settings'),
  ('settings.pin.configure', 'Settings', 'Configure admin PIN'),
  ('settings.branches.view', 'Settings', 'View branches'),
  ('settings.branches.create', 'Settings', 'Create branches'),
  ('settings.branches.edit', 'Settings', 'Edit branches'),
  ('settings.branches.delete', 'Settings', 'Delete branches'),
  ('settings.branding.view', 'Settings', 'View branding'),
  ('settings.branding.edit', 'Settings', 'Edit branding'),
  ('settings.payments.view', 'Settings', 'View payments'),
  ('settings.payments.edit', 'Settings', 'Edit payments'),
  ('settings.subscription.view', 'Settings', 'View subscription'),
  ('settings.subscription.manage', 'Settings', 'Manage subscription'),
  ('settings.team.view', 'Settings', 'View team'),
  ('settings.team.create', 'Settings', 'Create team members'),
  ('settings.team.edit', 'Settings', 'Edit team members'),
  ('settings.team.delete', 'Settings', 'Delete team members'),
  ('settings.roles.manage', 'Settings', 'Manage roles & permissions'),
  ('settings.tournaments.view', 'Settings', 'View tournaments'),
  ('settings.tournaments.manage', 'Settings', 'Manage tournaments'),
  ('settings.leaderboard.reset', 'Settings', 'Reset leaderboard'),
  ('audit.login_logs.view', 'Audit', 'View login logs'),
  ('ai.view', 'AI', 'View AI assistant'),
  ('ai.use', 'AI', 'Use AI assistant'),
  ('hr.view', 'Staff HR', 'Staff Management console'),
  ('hr.directory.view', 'Staff HR', 'View directory'),
  ('hr.directory.edit', 'Staff HR', 'Edit directory'),
  ('hr.directory.salary.view', 'Staff HR', 'View salaries'),
  ('hr.directory.salary.edit', 'Staff HR', 'Edit salaries'),
  ('hr.attendance.view', 'Staff HR', 'View attendance'),
  ('hr.attendance.edit', 'Staff HR', 'Edit attendance'),
  ('hr.shifts.view', 'Staff HR', 'View shifts'),
  ('hr.shifts.edit', 'Staff HR', 'Edit shifts'),
  ('hr.requests.view', 'Staff HR', 'View requests'),
  ('hr.requests.approve', 'Staff HR', 'Approve requests'),
  ('hr.payroll.view', 'Staff HR', 'View payroll'),
  ('hr.payroll.generate', 'Staff HR', 'Generate payroll'),
  ('hr.payroll.edit', 'Staff HR', 'Edit payroll'),
  ('hr.payroll.approve', 'Staff HR', 'Approve payroll'),
  ('hr.policies.view', 'Staff HR', 'View policies'),
  ('hr.policies.edit', 'Staff HR', 'Edit policies'),
  ('hr.holidays.view', 'Staff HR', 'View holidays'),
  ('hr.holidays.edit', 'Staff HR', 'Edit holidays'),
  ('hr.audit.view', 'Staff HR', 'View HR audit'),
  ('scope.all_branches', 'Scope', 'All branches'),
  ('roles.manage', 'Scope', 'Manage roles')
ON CONFLICT (key) DO NOTHING;

-- ── Seed system roles per organization ────────────────────────────────────────
DO $$
DECLARE
  org_rec RECORD;
  role_rec RECORD;
  perm_key TEXT;
BEGIN
  FOR org_rec IN SELECT id FROM public.organizations LOOP
    INSERT INTO public.workspace_roles (organization_id, name, slug, description, is_system)
    VALUES
      (org_rec.id, 'Owner', 'owner', 'Full venue access', true),
      (org_rec.id, 'Venue Admin', 'venue_admin', 'Day-to-day ops + staff HR', true),
      (org_rec.id, 'Shift Manager', 'shift_manager', 'Floor lead', true),
      (org_rec.id, 'Employee', 'employee', 'Starts stations and bills', true),
      (org_rec.id, 'Accountant / Viewer', 'accountant', 'Read-only reports', true)
    ON CONFLICT (organization_id, name) DO NOTHING;

    -- Owner: all permissions
    FOR role_rec IN
      SELECT id FROM public.workspace_roles
       WHERE organization_id = org_rec.id AND slug = 'owner'
    LOOP
      INSERT INTO public.workspace_role_permissions (role_id, permission_key)
      SELECT role_rec.id, k.key FROM public.workspace_permission_keys k
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Venue admin permissions
    FOR role_rec IN
      SELECT id FROM public.workspace_roles
       WHERE organization_id = org_rec.id AND slug = 'venue_admin'
    LOOP
      INSERT INTO public.workspace_role_permissions (role_id, permission_key)
      SELECT role_rec.id, k.key FROM public.workspace_permission_keys k
       WHERE k.key = ANY (ARRAY[
        'dashboard.view','dashboard.analytics.view','dashboard.expenses.view','dashboard.expenses.edit','dashboard.expenses.delete',
        'dashboard.vault.view','dashboard.vault.deposit','dashboard.vault.withdraw',
        'pos.view','pos.checkout','pos.discount','pos.void_bill','pos.late_night_override','pos.credit_sale',
        'stations.view','stations.start_session','stations.end_session','stations.pause','stations.multi_start','stations.configure','stations.maintenance',
        'products.view','products.create','products.edit','products.delete','products.stock_adjust',
        'customers.view','customers.create','customers.edit','customers.delete','customers.export','customers.membership_edit',
        'reports.view','reports.bills','reports.sessions','reports.customers','reports.summary','reports.export','reports.delete_record',
        'bookings.view','bookings.create','bookings.edit','bookings.cancel','bookings.check_in','bookings.reconciliation','bookings.coupons_manage','bookings.slots_configure','bookings.popups_manage',
        'settings.general.view','settings.general.edit','settings.pin.configure',
        'settings.tournaments.view','settings.tournaments.manage','settings.leaderboard.reset',
        'ai.view','ai.use',
        'hr.view','hr.directory.view','hr.directory.edit','hr.directory.salary.view','hr.directory.salary.edit',
        'hr.attendance.view','hr.attendance.edit','hr.shifts.view','hr.shifts.edit',
        'hr.requests.view','hr.requests.approve','hr.payroll.view','hr.payroll.generate','hr.payroll.edit','hr.payroll.approve',
        'hr.policies.view','hr.policies.edit','hr.holidays.view','hr.holidays.edit','hr.audit.view'
      ])
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Shift manager
    FOR role_rec IN
      SELECT id FROM public.workspace_roles WHERE organization_id = org_rec.id AND slug = 'shift_manager'
    LOOP
      INSERT INTO public.workspace_role_permissions (role_id, permission_key)
      SELECT role_rec.id, k.key FROM public.workspace_permission_keys k
       WHERE k.key = ANY (ARRAY[
        'dashboard.view','dashboard.analytics.view','dashboard.expenses.view','dashboard.expenses.edit','dashboard.expenses.delete','dashboard.vault.view',
        'pos.view','pos.checkout','pos.discount',
        'stations.view','stations.start_session','stations.end_session','stations.pause','stations.multi_start',
        'products.view','products.edit',
        'customers.view','customers.create','customers.edit','customers.membership_edit',
        'reports.view','reports.bills','reports.sessions','reports.customers','reports.summary','reports.export',
        'bookings.view','bookings.check_in','bookings.edit',
        'settings.tournaments.view','settings.leaderboard.reset'
      ])
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Employee
    FOR role_rec IN
      SELECT id FROM public.workspace_roles WHERE organization_id = org_rec.id AND slug = 'employee'
    LOOP
      INSERT INTO public.workspace_role_permissions (role_id, permission_key)
      SELECT role_rec.id, k.key FROM public.workspace_permission_keys k
       WHERE k.key = ANY (ARRAY[
        'dashboard.view',
        'pos.view','pos.checkout',
        'stations.view','stations.start_session','stations.end_session','stations.pause',
        'products.view',
        'customers.view','customers.create',
        'reports.view','reports.bills','reports.sessions',
        'bookings.view','bookings.check_in',
        'settings.general.view','settings.tournaments.view'
      ])
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Accountant
    FOR role_rec IN
      SELECT id FROM public.workspace_roles WHERE organization_id = org_rec.id AND slug = 'accountant'
    LOOP
      INSERT INTO public.workspace_role_permissions (role_id, permission_key)
      SELECT role_rec.id, k.key FROM public.workspace_permission_keys k
       WHERE k.key = ANY (ARRAY[
        'dashboard.view','dashboard.analytics.view','dashboard.expenses.view',
        'reports.view','reports.bills','reports.sessions','reports.customers','reports.summary','reports.export',
        'bookings.view','bookings.reconciliation'
      ])
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END$$;

-- ── Backfill role assignments from legacy flags ───────────────────────────────
INSERT INTO public.admin_user_roles (admin_user_id, role_id)
SELECT DISTINCT ON (au.id)
  au.id,
  wr.id
FROM public.admin_users au
JOIN public.org_memberships om ON om.admin_user_id = au.id
JOIN public.workspace_roles wr ON wr.organization_id = om.organization_id
  AND wr.slug = CASE
    WHEN au.is_super_admin = true THEN 'owner'
    WHEN au.is_admin = true THEN 'venue_admin'
    ELSE 'employee'
  END
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_user_roles aur WHERE aur.admin_user_id = au.id
)
ORDER BY au.id, om.created_at NULLS LAST
ON CONFLICT (admin_user_id) DO NOTHING;
