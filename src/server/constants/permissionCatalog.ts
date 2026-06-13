/** Workspace RBAC permission catalog and default role templates. */

export type SystemRoleSlug =
  | 'owner'
  | 'venue_admin'
  | 'shift_manager'
  | 'employee'
  | 'accountant';

export type PermissionMeta = {
  key: string;
  groupLabel: string;
  label: string;
  description?: string;
  requiresPlan?: 'staff_hr_enabled' | 'bookings_enabled' | 'premium_modules_enabled';
};

export const SYSTEM_ROLE_LABELS: Record<SystemRoleSlug, string> = {
  owner: 'Owner',
  venue_admin: 'Venue Admin',
  shift_manager: 'Shift Manager',
  employee: 'Employee',
  accountant: 'Accountant / Viewer',
};

export const PERMISSION_CATALOG: PermissionMeta[] = [
  { key: 'dashboard.view', groupLabel: 'Dashboard', label: 'View dashboard' },
  { key: 'dashboard.analytics.view', groupLabel: 'Dashboard', label: 'View analytics' },
  { key: 'dashboard.expenses.view', groupLabel: 'Dashboard', label: 'View expenses' },
  { key: 'dashboard.expenses.edit', groupLabel: 'Dashboard', label: 'Edit expenses' },
  { key: 'dashboard.expenses.delete', groupLabel: 'Dashboard', label: 'Delete expenses' },
  { key: 'dashboard.vault.view', groupLabel: 'Dashboard', label: 'View vault' },
  { key: 'dashboard.vault.deposit', groupLabel: 'Dashboard', label: 'Vault deposits' },
  { key: 'dashboard.vault.withdraw', groupLabel: 'Dashboard', label: 'Vault withdrawals' },
  { key: 'pos.view', groupLabel: 'POS', label: 'View POS' },
  { key: 'pos.checkout', groupLabel: 'POS', label: 'Checkout & bill' },
  { key: 'pos.discount', groupLabel: 'POS', label: 'Apply discounts' },
  { key: 'pos.void_bill', groupLabel: 'POS', label: 'Void bills' },
  { key: 'pos.late_night_override', groupLabel: 'POS', label: 'Late-night rate override' },
  { key: 'pos.credit_sale', groupLabel: 'POS', label: 'Credit sales' },
  { key: 'stations.view', groupLabel: 'Gaming Stations', label: 'View stations' },
  { key: 'stations.start_session', groupLabel: 'Gaming Stations', label: 'Start sessions' },
  { key: 'stations.end_session', groupLabel: 'Gaming Stations', label: 'End sessions' },
  { key: 'stations.pause', groupLabel: 'Gaming Stations', label: 'Pause sessions' },
  { key: 'stations.multi_start', groupLabel: 'Gaming Stations', label: 'Multi-start sessions' },
  { key: 'stations.configure', groupLabel: 'Gaming Stations', label: 'Configure stations' },
  { key: 'stations.maintenance', groupLabel: 'Gaming Stations', label: 'Maintenance mode' },
  { key: 'products.view', groupLabel: 'Products', label: 'View products' },
  { key: 'products.create', groupLabel: 'Products', label: 'Create products' },
  { key: 'products.edit', groupLabel: 'Products', label: 'Edit products' },
  { key: 'products.delete', groupLabel: 'Products', label: 'Delete products' },
  { key: 'products.stock_adjust', groupLabel: 'Products', label: 'Adjust stock' },
  { key: 'customers.view', groupLabel: 'Customers', label: 'View customers' },
  { key: 'customers.create', groupLabel: 'Customers', label: 'Create customers' },
  { key: 'customers.edit', groupLabel: 'Customers', label: 'Edit customers' },
  { key: 'customers.delete', groupLabel: 'Customers', label: 'Delete customers' },
  { key: 'customers.export', groupLabel: 'Customers', label: 'Export customers' },
  { key: 'customers.membership_edit', groupLabel: 'Customers', label: 'Edit memberships' },
  { key: 'reports.view', groupLabel: 'Reports', label: 'View reports' },
  { key: 'reports.bills', groupLabel: 'Reports', label: 'Bills tab' },
  { key: 'reports.sessions', groupLabel: 'Reports', label: 'Sessions tab' },
  { key: 'reports.customers', groupLabel: 'Reports', label: 'Customers tab' },
  { key: 'reports.summary', groupLabel: 'Reports', label: 'Summary tab' },
  { key: 'reports.export', groupLabel: 'Reports', label: 'Export reports' },
  { key: 'reports.delete_record', groupLabel: 'Reports', label: 'Delete report records' },
  { key: 'bookings.view', groupLabel: 'Bookings', label: 'View bookings', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.create', groupLabel: 'Bookings', label: 'Create bookings', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.edit', groupLabel: 'Bookings', label: 'Edit bookings', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.cancel', groupLabel: 'Bookings', label: 'Cancel bookings', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.check_in', groupLabel: 'Bookings', label: 'Check in bookings', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.reconciliation', groupLabel: 'Bookings', label: 'Reconciliation', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.coupons_manage', groupLabel: 'Bookings', label: 'Manage coupons', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.slots_configure', groupLabel: 'Bookings', label: 'Configure slots', requiresPlan: 'bookings_enabled' },
  { key: 'bookings.popups_manage', groupLabel: 'Bookings', label: 'Manage popups', requiresPlan: 'bookings_enabled' },
  { key: 'settings.general.view', groupLabel: 'Settings', label: 'View general settings' },
  { key: 'settings.general.edit', groupLabel: 'Settings', label: 'Edit general settings' },
  { key: 'settings.pin.configure', groupLabel: 'Settings', label: 'Configure admin PIN' },
  { key: 'settings.branches.view', groupLabel: 'Settings', label: 'View branches' },
  { key: 'settings.branches.create', groupLabel: 'Settings', label: 'Create branches' },
  { key: 'settings.branches.edit', groupLabel: 'Settings', label: 'Edit branches' },
  { key: 'settings.branches.delete', groupLabel: 'Settings', label: 'Delete branches' },
  { key: 'settings.branding.view', groupLabel: 'Settings', label: 'View branding' },
  { key: 'settings.branding.edit', groupLabel: 'Settings', label: 'Edit branding' },
  { key: 'settings.payments.view', groupLabel: 'Settings', label: 'View payments' },
  { key: 'settings.payments.edit', groupLabel: 'Settings', label: 'Edit payments' },
  { key: 'settings.subscription.view', groupLabel: 'Settings', label: 'View subscription' },
  { key: 'settings.subscription.manage', groupLabel: 'Settings', label: 'Manage subscription' },
  { key: 'settings.team.view', groupLabel: 'Settings', label: 'View team' },
  { key: 'settings.team.create', groupLabel: 'Settings', label: 'Create team members' },
  { key: 'settings.team.edit', groupLabel: 'Settings', label: 'Edit team members' },
  { key: 'settings.team.delete', groupLabel: 'Settings', label: 'Delete team members' },
  { key: 'settings.roles.manage', groupLabel: 'Settings', label: 'Manage roles & permissions' },
  { key: 'settings.tournaments.view', groupLabel: 'Settings', label: 'View tournaments' },
  { key: 'settings.tournaments.manage', groupLabel: 'Settings', label: 'Manage tournaments' },
  { key: 'settings.leaderboard.reset', groupLabel: 'Settings', label: 'Reset leaderboard' },
  { key: 'audit.login_logs.view', groupLabel: 'Audit', label: 'View login logs' },
  { key: 'ai.view', groupLabel: 'AI', label: 'View AI assistant', requiresPlan: 'premium_modules_enabled' },
  { key: 'ai.use', groupLabel: 'AI', label: 'Use AI assistant', requiresPlan: 'premium_modules_enabled' },
  { key: 'hr.view', groupLabel: 'Staff HR', label: 'Staff Management console', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.directory.view', groupLabel: 'Staff HR', label: 'View directory', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.directory.edit', groupLabel: 'Staff HR', label: 'Edit directory', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.directory.salary.view', groupLabel: 'Staff HR', label: 'View salaries', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.directory.salary.edit', groupLabel: 'Staff HR', label: 'Edit salaries', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.attendance.view', groupLabel: 'Staff HR', label: 'View attendance', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.attendance.edit', groupLabel: 'Staff HR', label: 'Edit attendance', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.shifts.view', groupLabel: 'Staff HR', label: 'View shifts', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.shifts.edit', groupLabel: 'Staff HR', label: 'Edit shifts', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.requests.view', groupLabel: 'Staff HR', label: 'View requests', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.requests.approve', groupLabel: 'Staff HR', label: 'Approve requests', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.payroll.view', groupLabel: 'Staff HR', label: 'View payroll', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.payroll.generate', groupLabel: 'Staff HR', label: 'Generate payroll', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.payroll.edit', groupLabel: 'Staff HR', label: 'Edit payroll', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.payroll.approve', groupLabel: 'Staff HR', label: 'Approve payroll', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.policies.view', groupLabel: 'Staff HR', label: 'View policies', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.policies.edit', groupLabel: 'Staff HR', label: 'Edit policies', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.holidays.view', groupLabel: 'Staff HR', label: 'View holidays', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.holidays.edit', groupLabel: 'Staff HR', label: 'Edit holidays', requiresPlan: 'staff_hr_enabled' },
  { key: 'hr.audit.view', groupLabel: 'Staff HR', label: 'View HR audit', requiresPlan: 'staff_hr_enabled' },
  { key: 'scope.all_branches', groupLabel: 'Scope', label: 'All branches' },
  { key: 'roles.manage', groupLabel: 'Scope', label: 'Manage roles' },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

const P = (...keys: string[]) => keys;

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleSlug, string[]> = {
  owner: [...ALL_PERMISSION_KEYS],
  venue_admin: P(
    'dashboard.view', 'dashboard.analytics.view', 'dashboard.expenses.view', 'dashboard.expenses.edit', 'dashboard.expenses.delete',
    'dashboard.vault.view', 'dashboard.vault.deposit', 'dashboard.vault.withdraw',
    'pos.view', 'pos.checkout', 'pos.discount', 'pos.void_bill', 'pos.late_night_override', 'pos.credit_sale',
    'stations.view', 'stations.start_session', 'stations.end_session', 'stations.pause', 'stations.multi_start', 'stations.configure', 'stations.maintenance',
    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.stock_adjust',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.export', 'customers.membership_edit',
    'reports.view', 'reports.bills', 'reports.sessions', 'reports.customers', 'reports.summary', 'reports.export', 'reports.delete_record',
    'bookings.view', 'bookings.create', 'bookings.edit', 'bookings.cancel', 'bookings.check_in', 'bookings.reconciliation', 'bookings.coupons_manage', 'bookings.slots_configure', 'bookings.popups_manage',
    'settings.general.view', 'settings.general.edit', 'settings.pin.configure',
    'settings.tournaments.view', 'settings.tournaments.manage', 'settings.leaderboard.reset',
    'ai.view', 'ai.use',
    'hr.view', 'hr.directory.view', 'hr.directory.edit', 'hr.directory.salary.view', 'hr.directory.salary.edit',
    'hr.attendance.view', 'hr.attendance.edit', 'hr.shifts.view', 'hr.shifts.edit',
    'hr.requests.view', 'hr.requests.approve', 'hr.payroll.view', 'hr.payroll.generate', 'hr.payroll.edit', 'hr.payroll.approve',
    'hr.policies.view', 'hr.policies.edit', 'hr.holidays.view', 'hr.holidays.edit', 'hr.audit.view',
  ),
  shift_manager: P(
    'dashboard.view', 'dashboard.analytics.view', 'dashboard.expenses.view', 'dashboard.expenses.edit', 'dashboard.expenses.delete',
    'dashboard.vault.view',
    'pos.view', 'pos.checkout', 'pos.discount',
    'stations.view', 'stations.start_session', 'stations.end_session', 'stations.pause', 'stations.multi_start',
    'products.view', 'products.edit',
    'customers.view', 'customers.create', 'customers.edit', 'customers.membership_edit',
    'reports.view', 'reports.bills', 'reports.sessions', 'reports.customers', 'reports.summary', 'reports.export',
    'bookings.view', 'bookings.check_in', 'bookings.edit',
    'settings.tournaments.view', 'settings.leaderboard.reset',
  ),
  employee: P(
    'dashboard.view',
    'pos.view', 'pos.checkout',
    'stations.view', 'stations.start_session', 'stations.end_session', 'stations.pause',
    'products.view',
    'customers.view', 'customers.create',
    'reports.view', 'reports.bills', 'reports.sessions',
    'bookings.view', 'bookings.check_in',
    'settings.general.view', 'settings.tournaments.view',
  ),
  accountant: P(
    'dashboard.view', 'dashboard.analytics.view', 'dashboard.expenses.view',
    'reports.view', 'reports.bills', 'reports.sessions', 'reports.customers', 'reports.summary', 'reports.export',
    'bookings.view', 'bookings.reconciliation',
  ),
};

/** Map legacy admin flags to default system role when no assignment exists. */
export function legacyRoleSlug(opts: {
  isSuperAdmin: boolean;
  isAdmin: boolean;
}): SystemRoleSlug {
  if (opts.isSuperAdmin) return 'owner';
  if (opts.isAdmin) return 'venue_admin';
  return 'employee';
}

/** Sidebar path → minimum view permission. */
export const SIDEBAR_PERMISSIONS: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/pos': 'pos.view',
  '/stations': 'stations.view',
  '/products': 'products.view',
  '/customers': 'customers.view',
  '/reports': 'reports.view',
  '/booking-management': 'bookings.view',
  '/tournaments': 'settings.tournaments.view',
  '/staff': 'hr.view',
  '/chat-ai': 'ai.view',
  '/subscription': 'settings.subscription.view',
  '/settings': 'settings.general.view',
};

/** Staff HR console tab → permission to view. */
export const HR_TAB_PERMISSIONS: Record<string, string> = {
  overview: 'hr.view',
  directory: 'hr.directory.view',
  attendance: 'hr.attendance.view',
  calendar: 'hr.attendance.view',
  shifts: 'hr.shifts.view',
  requests: 'hr.requests.view',
  payroll: 'hr.payroll.view',
  reports: 'hr.attendance.view',
  policies: 'hr.policies.view',
  holidays: 'hr.holidays.view',
  audit: 'hr.audit.view',
};

/** Settings tab → permission to view. */
export const SETTINGS_TAB_PERMISSIONS: Record<string, string> = {
  general: 'settings.general.view',
  branding: 'settings.branding.view',
  subscription: 'settings.subscription.view',
  branches: 'settings.branches.view',
  booking: 'bookings.view',
  payments: 'settings.payments.view',
  team: 'settings.team.view',
  tournaments: 'settings.tournaments.view',
  leaderboard: 'settings.tournaments.view',
};
