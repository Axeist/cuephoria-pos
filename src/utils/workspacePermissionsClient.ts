import type { SystemRoleSlug } from '@/constants/permissionCatalog';

export type WorkspaceAccessSnapshot = {
  permissions: string[];
  bypass: boolean;
  role: {
    id: string;
    name: string;
    slug: SystemRoleSlug | string | null;
    isSystem: boolean;
  } | null;
  hasStaffProfile: boolean;
};

export function canShowMyPortalSidebar(access: WorkspaceAccessSnapshot): boolean {
  if (access.role?.slug === 'owner') return false;
  return (
    access.hasStaffProfile ||
    access.permissions.includes('pos.view') ||
    access.permissions.includes('stations.view')
  );
}

export function canShowStaffManagementSidebar(access: WorkspaceAccessSnapshot): boolean {
  return access.bypass || access.permissions.includes('hr.view');
}

export function isAdminLoginRoleSlug(slug: string | null | undefined): boolean {
  return slug === 'owner' || slug === 'venue_admin';
}

export function roleNeedsStaffProfile(
  slug: string | null | undefined,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return false;
  return !isAdminLoginRoleSlug(slug);
}
