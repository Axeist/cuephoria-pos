import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  legacyRoleSlug,
  type SystemRoleSlug,
} from "../constants/permissionCatalog";
import { hasWorkspacePermission } from "../constants/permissionResolve";

export type ResolvedWorkspaceAccess = {
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

export async function resolveWorkspaceAccess(
  supabase: SupabaseClient,
  opts: {
    adminUserId: string;
    organizationId: string;
    isSuperAdmin: boolean;
    isAdmin: boolean;
  },
): Promise<ResolvedWorkspaceAccess> {
  const { data: profileRow } = await supabase
    .from("staff_profiles")
    .select("user_id")
    .eq("admin_user_id", opts.adminUserId)
    .maybeSingle();

  const hasStaffProfile = !!profileRow?.user_id;

  if (opts.isSuperAdmin) {
    return {
      permissions: [...ALL_PERMISSION_KEYS],
      bypass: true,
      role: { id: "", name: "Owner", slug: "owner", isSystem: true },
      hasStaffProfile,
    };
  }

  const { data: assignment } = await supabase
    .from("admin_user_roles")
    .select(
      "role_id, workspace_roles:role_id ( id, name, slug, is_system, organization_id )",
    )
    .eq("admin_user_id", opts.adminUserId)
    .maybeSingle();

  type RoleEmbed = {
    id: string;
    name: string;
    slug: string | null;
    is_system: boolean;
    organization_id: string;
  };

  const embedded = assignment?.workspace_roles as RoleEmbed | RoleEmbed[] | null;
  const roleRow = Array.isArray(embedded) ? embedded[0] : embedded;

  if (roleRow && roleRow.organization_id === opts.organizationId) {
    const { data: permRows } = await supabase
      .from("workspace_role_permissions")
      .select("permission_key")
      .eq("role_id", roleRow.id);

    return {
      permissions: (permRows ?? []).map((r) => r.permission_key as string),
      bypass: false,
      role: {
        id: roleRow.id,
        name: roleRow.name,
        slug: roleRow.slug,
        isSystem: roleRow.is_system,
      },
      hasStaffProfile,
    };
  }

  const fallbackSlug = legacyRoleSlug({
    isSuperAdmin: opts.isSuperAdmin,
    isAdmin: opts.isAdmin,
  });

  return {
    permissions: [...DEFAULT_ROLE_PERMISSIONS[fallbackSlug]],
    bypass: false,
    role: {
      id: "",
      name: fallbackSlug,
      slug: fallbackSlug,
      isSystem: true,
    },
    hasStaffProfile,
  };
}

export function canShowMyPortalSidebar(access: ResolvedWorkspaceAccess): boolean {
  if (access.role?.slug === "owner") return false;
  return (
    access.hasStaffProfile ||
    access.permissions.includes("pos.view") ||
    access.permissions.includes("stations.view")
  );
}

export function canShowStaffManagementSidebar(access: ResolvedWorkspaceAccess): boolean {
  return access.bypass || access.permissions.includes("hr.view");
}

export function assertWorkspacePermission(
  access: ResolvedWorkspaceAccess,
  key: string,
): { ok: true } | { ok: false; error: string } {
  if (access.bypass || hasWorkspacePermission(access.permissions, key)) return { ok: true };
  return { ok: false, error: "You do not have permission for this action." };
}

/** Login portal split: Owner and Venue Admin use the admin sign-in path. */
export function isAdminLoginRoleSlug(slug: string | null | undefined): boolean {
  return slug === "owner" || slug === "venue_admin";
}

/** Floor staff roles get HR profile + portal PIN on create. */
export function roleNeedsStaffProfile(
  slug: string | null | undefined,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return false;
  return !isAdminLoginRoleSlug(slug);
}
