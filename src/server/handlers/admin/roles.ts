import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { resolveOrgContext } from "../../orgContext";
import { resolveWorkspaceAccess } from "../../lib/workspacePermissions";
import { PERMISSION_CATALOG, SYSTEM_ROLE_LABELS } from "../../constants/permissionCatalog";

export const config = { runtime: "edge" };

/** List roles, get role detail, create/update custom roles, assign permissions. */
export default async function handler(req: Request) {
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser) return j({ ok: false, error: "Unauthorized" }, 401);

    const ctx = await resolveOrgContext(req);
    if ("code" in ctx) {
      return j({ ok: false, error: ctx.message || "Workspace not resolved" }, ctx.status);
    }

    const access = await resolveWorkspaceAccess(ctx.supabase, {
      adminUserId: sessionUser.id,
      organizationId: ctx.organizationId,
      isSuperAdmin: sessionUser.isSuperAdmin,
      isAdmin: sessionUser.isAdmin,
    });

    const canManage =
      access.bypass ||
      access.permissions.includes("roles.manage") ||
      access.permissions.includes("settings.team.edit");

    if (req.method === "GET") {
      const url = new URL(req.url);
      const roleId = url.searchParams.get("roleId");

      if (roleId) {
        const { data: role, error } = await ctx.supabase
          .from("workspace_roles")
          .select("*")
          .eq("id", roleId)
          .eq("organization_id", ctx.organizationId)
          .maybeSingle();
        if (error || !role) return j({ ok: false, error: "Role not found" }, 404);

        const { data: perms } = await ctx.supabase
          .from("workspace_role_permissions")
          .select("permission_key")
          .eq("role_id", roleId);

        return j({
          ok: true,
          role,
          permissions: (perms ?? []).map((p) => p.permission_key),
          catalog: PERMISSION_CATALOG,
        });
      }

      const { data: roles, error } = await ctx.supabase
        .from("workspace_roles")
        .select("id, name, slug, description, is_system, created_at, updated_at")
        .eq("organization_id", ctx.organizationId)
        .order("is_system", { ascending: false })
        .order("name");

      if (error) return j({ ok: false, error: error.message }, 500);

      return j({
        ok: true,
        roles: roles ?? [],
        catalog: PERMISSION_CATALOG,
        systemRoleLabels: SYSTEM_ROLE_LABELS,
        canManage,
      });
    }

    if (!canManage) {
      return j({ ok: false, error: "You do not have permission to manage roles" }, 403);
    }

    if (req.method === "POST") {
      const body = (await req.json()) as {
        action?: string;
        roleId?: string;
        name?: string;
        description?: string;
        permissions?: string[];
        cloneFromRoleId?: string;
        adminUserId?: string;
      };

      if (body.action === "assign_user" && body.adminUserId && body.roleId) {
        const { data: role } = await ctx.supabase
          .from("workspace_roles")
          .select("id")
          .eq("id", body.roleId)
          .eq("organization_id", ctx.organizationId)
          .maybeSingle();
        if (!role) return j({ ok: false, error: "Role not found" }, 404);

        const { error } = await ctx.supabase.from("admin_user_roles").upsert(
          {
            admin_user_id: body.adminUserId,
            role_id: body.roleId,
            assigned_by: sessionUser.id,
            assigned_at: new Date().toISOString(),
          },
          { onConflict: "admin_user_id" },
        );
        if (error) return j({ ok: false, error: error.message }, 500);
        return j({ ok: true });
      }

      if (body.action === "update_permissions" && body.roleId && body.permissions) {
        const { data: role } = await ctx.supabase
          .from("workspace_roles")
          .select("id, is_system, slug")
          .eq("id", body.roleId)
          .eq("organization_id", ctx.organizationId)
          .maybeSingle();
        if (!role) return j({ ok: false, error: "Role not found" }, 404);
        if (role.is_system && role.slug === "owner" && !access.bypass) {
          return j({ ok: false, error: "Only owners can edit the Owner role" }, 403);
        }

        const validKeys = new Set(PERMISSION_CATALOG.map((p) => p.key));
        const keys = body.permissions.filter((k) => validKeys.has(k));

        await ctx.supabase
          .from("workspace_role_permissions")
          .delete()
          .eq("role_id", body.roleId);

        if (keys.length) {
          const { error } = await ctx.supabase.from("workspace_role_permissions").insert(
            keys.map((permission_key) => ({ role_id: body.roleId!, permission_key })),
          );
          if (error) return j({ ok: false, error: error.message }, 500);
        }

        await ctx.supabase
          .from("workspace_roles")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", body.roleId);

        return j({ ok: true });
      }

      if (body.action === "create" && body.name?.trim()) {
        let permissions = body.permissions ?? [];
        if (body.cloneFromRoleId) {
          const { data: clonePerms } = await ctx.supabase
            .from("workspace_role_permissions")
            .select("permission_key")
            .eq("role_id", body.cloneFromRoleId);
          permissions = (clonePerms ?? []).map((p) => p.permission_key as string);
        }

        const { data: created, error } = await ctx.supabase
          .from("workspace_roles")
          .insert({
            organization_id: ctx.organizationId,
            name: body.name.trim(),
            description: body.description?.trim() || null,
            is_system: false,
          })
          .select("id")
          .single();
        if (error || !created) return j({ ok: false, error: error?.message || "Create failed" }, 500);

        const validKeys = new Set(PERMISSION_CATALOG.map((p) => p.key));
        const keys = permissions.filter((k) => validKeys.has(k));
        if (keys.length) {
          await ctx.supabase.from("workspace_role_permissions").insert(
            keys.map((permission_key) => ({ role_id: created.id, permission_key })),
          );
        }

        return j({ ok: true, roleId: created.id });
      }

      return j({ ok: false, error: "Unknown action" }, 400);
    }

    return j({ ok: false, error: "Method not allowed" }, 405);
  } catch (err: unknown) {
    console.error("roles handler error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
