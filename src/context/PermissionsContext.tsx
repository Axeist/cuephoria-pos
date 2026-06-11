import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganizationOptional } from '@/context/OrganizationContext';
import type { PermissionMeta } from '@/constants/permissionCatalog';
import type { SystemRoleSlug } from '@/constants/permissionCatalog';
import {
  DEFAULT_ROLE_PERMISSIONS,
  legacyRoleSlug,
} from '@/constants/permissionCatalog';
import {
  canShowMyPortalSidebar,
  canShowStaffManagementSidebar,
} from '@/utils/workspacePermissionsClient';

export type WorkspaceRoleInfo = {
  id: string;
  name: string;
  slug: SystemRoleSlug | string | null;
  isSystem: boolean;
} | null;

type PermissionsContextValue = {
  permissions: string[];
  permissionSet: Set<string>;
  role: WorkspaceRoleInfo;
  hasStaffProfile: boolean;
  bypass: boolean;
  catalog: PermissionMeta[];
  isLoading: boolean;
  can: (key: string) => boolean;
  showStaffManagement: boolean;
  showMyPortal: boolean;
  refresh: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

function resolveClientPermissions(opts: {
  permissions: string[];
  bypass: boolean;
  role: WorkspaceRoleInfo;
  user: { isSuperAdmin?: boolean; isAdmin?: boolean } | null;
}): string[] {
  if (opts.bypass || opts.permissions.length > 0) return opts.permissions;

  const roleSlug = opts.role?.slug;
  if (roleSlug && roleSlug in DEFAULT_ROLE_PERMISSIONS) {
    return [...DEFAULT_ROLE_PERMISSIONS[roleSlug as SystemRoleSlug]];
  }

  if (opts.user) {
    const slug = legacyRoleSlug({
      isSuperAdmin: !!opts.user.isSuperAdmin,
      isAdmin: !!opts.user.isAdmin,
    });
    return [...DEFAULT_ROLE_PERMISSIONS[slug]];
  }

  return [];
}

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const orgCtx = useOrganizationOptional();
  const orgId = orgCtx?.organization?.id;

  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<WorkspaceRoleInfo>(null);
  const [hasStaffProfile, setHasStaffProfile] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [catalog, setCatalog] = useState<PermissionMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !orgId) {
      setPermissions([]);
      setRole(null);
      setHasStaffProfile(false);
      setBypass(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/permissions', { credentials: 'same-origin' });
      const json = await res.json();
      if (json?.ok) {
        const bypassFlag = !!json.bypass;
        const roleInfo = (json.role ?? null) as WorkspaceRoleInfo;
        const perms = resolveClientPermissions({
          permissions: json.permissions ?? [],
          bypass: bypassFlag,
          role: roleInfo,
          user,
        });
        setPermissions(perms);
        setRole(roleInfo);
        setHasStaffProfile(!!json.hasStaffProfile);
        setBypass(bypassFlag);
        setCatalog(json.catalog ?? []);
      } else if (user) {
        const slug = legacyRoleSlug({
          isSuperAdmin: !!user.isSuperAdmin,
          isAdmin: !!user.isAdmin,
        });
        setPermissions([...DEFAULT_ROLE_PERMISSIONS[slug]]);
        setRole({ id: '', name: slug, slug, isSystem: true });
        setHasStaffProfile(false);
        setBypass(false);
      } else {
        setPermissions([]);
        setRole(null);
        setHasStaffProfile(false);
        setBypass(false);
      }
    } catch {
      if (user) {
        const slug = legacyRoleSlug({
          isSuperAdmin: !!user.isSuperAdmin,
          isAdmin: !!user.isAdmin,
        });
        setPermissions([...DEFAULT_ROLE_PERMISSIONS[slug]]);
        setRole({ id: '', name: slug, slug, isSystem: true });
      } else {
        setPermissions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const can = useCallback(
    (key: string) => bypass || permissionSet.has(key),
    [bypass, permissionSet],
  );

  const accessSnapshot = useMemo(
    () => ({
      permissions,
      bypass,
      role,
      hasStaffProfile,
    }),
    [permissions, bypass, role, hasStaffProfile],
  );

  const showStaffManagement = useMemo(
    () => canShowStaffManagementSidebar(accessSnapshot),
    [accessSnapshot],
  );

  const showMyPortal = useMemo(
    () => canShowMyPortalSidebar(accessSnapshot),
    [accessSnapshot],
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      permissionSet,
      role,
      hasStaffProfile,
      bypass,
      catalog,
      isLoading,
      can,
      showStaffManagement,
      showMyPortal,
      refresh: load,
    }),
    [
      permissions,
      permissionSet,
      role,
      hasStaffProfile,
      bypass,
      catalog,
      isLoading,
      can,
      showStaffManagement,
      showMyPortal,
      load,
    ],
  );

  return (
    <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
  );
};

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return ctx;
}

export function usePermissionsOptional(): PermissionsContextValue | undefined {
  return useContext(PermissionsContext);
}

export function usePermission(key: string): boolean {
  const { can, isLoading, bypass } = usePermissions();
  if (isLoading && !bypass) return false;
  return can(key);
}
