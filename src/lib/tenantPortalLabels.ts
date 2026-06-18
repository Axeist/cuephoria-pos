/** Tenant console (admin_users) capability — not the same as org_memberships.role in each workspace. */
export type TenantPortalKind = "workspace_super_admin" | "workspace_admin" | "workspace_staff";

export type WorkspaceMembershipBrief = {
  organizationId: string;
  slug: string;
  name: string | null;
  membershipRole: string;
};

/** Normalize `/api/admin/login` + `/api/admin/me` workspace payloads */
export function parseWorkspaceMembershipsPayload(raw: unknown): WorkspaceMembershipBrief[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkspaceMembershipBrief[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const organizationId = typeof r.organizationId === "string" ? r.organizationId : "";
    const slug = typeof r.slug === "string" ? r.slug : "";
    const membershipRole = typeof r.membershipRole === "string" ? r.membershipRole : "";
    if (!organizationId || !slug) continue;
    out.push({
      organizationId,
      slug,
      name: typeof r.name === "string" ? r.name : null,
      membershipRole,
    });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function tenantPortalKindFromFlags(isSuperAdmin: boolean, isAdmin: boolean): TenantPortalKind {
  if (isSuperAdmin) return "workspace_super_admin";
  if (isAdmin) return "workspace_admin";
  return "workspace_staff";
}

export function labelTenantPortalKind(kind: TenantPortalKind): string {
  switch (kind) {
    case "workspace_super_admin":
      return "Workspace super admin";
    case "workspace_admin":
      return "Workspace admin";
    default:
      return "Workspace staff";
  }
}

/** Human label for org_memberships.role within one workspace */
export function labelOrgMembershipRole(role: string): string {
  switch (role.trim().toLowerCase()) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "staff":
      return "Staff";
    case "read_only":
      return "Read-only";
    default:
      return role.replace(/_/g, " ");
  }
}

export function summarizeWorkspaceMemberships(
  memberships: WorkspaceMembershipBrief[],
  activeSlug?: string | null,
): string {
  if (!memberships.length) return "";
  const sorted = [...memberships].sort((a, b) => a.slug.localeCompare(b.slug));
  const parts = sorted.map((m) => {
    const label = m.name?.trim() || m.slug;
    const role = labelOrgMembershipRole(m.membershipRole);
    const here = activeSlug && m.slug === activeSlug ? " · active" : "";
    return `${label} (${role})${here}`;
  });
  return parts.join(" · ");
}
