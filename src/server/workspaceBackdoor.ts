/**
 * Platform backdoor accounts — one hidden admin per workspace for Cuetronix ops.
 * Never surfaced in tenant staff management; credentials live in workspace_backdoor_access.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "./passwordUtils";

const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";

export type WorkspaceBackdoorRow = {
  organizationId: string;
  orgSlug: string;
  orgName: string;
  adminUserId: string;
  /** Email-shaped login id (admin login form requires an @). */
  loginEmail: string;
  password: string;
  loginUrl: string;
  createdAt: string;
  wasCreated: boolean;
};

function generatePassword(length = 18): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return out;
}

/** Stable login email per workspace — used as both admin_users.username and .email */
export function buildBackdoorLoginEmail(slug: string, orgId: string, variant = 0): string {
  const safe = slug.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 24) || "ws";
  const tail = orgId.replace(/-/g, "").slice(0, 8).toLowerCase();
  if (variant <= 0) {
    return `platform+${safe}.${tail}@internal.cuetronix.app`;
  }
  return `platform+${safe}.${tail}.v${variant}@internal.cuetronix.app`;
}

/** Upgrade legacy cuephoria-slug usernames to email login after deploy. */
async function syncBackdoorLoginEmail(
  supabase: SupabaseClient,
  organizationId: string,
  orgSlug: string,
  adminUserId: string,
  storedLogin: string,
): Promise<string> {
  const loginEmail = buildBackdoorLoginEmail(orgSlug, organizationId);
  const normalizedStored = storedLogin.trim().toLowerCase();
  if (normalizedStored.includes("@") && normalizedStored === loginEmail) {
    return loginEmail;
  }

  const { error: userErr } = await supabase
    .from("admin_users")
    .update({
      username: loginEmail,
      email: loginEmail,
      email_verified_at: new Date().toISOString(),
    })
    .eq("id", adminUserId);
  if (userErr) throw userErr;

  const { error: credErr } = await supabase
    .from("workspace_backdoor_access")
    .update({ username: loginEmail })
    .eq("organization_id", organizationId);
  if (credErr) throw credErr;

  return loginEmail;
}

function loginPathForSlug(slug: string): string {
  return `/login?org=${encodeURIComponent(slug)}`;
}

async function syncAllBranchLinks(
  supabase: SupabaseClient,
  adminUserId: string,
  organizationId: string,
): Promise<void> {
  const { data: locations, error: locErr } = await supabase
    .from("locations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_active", true);
  if (locErr) throw locErr;

  await supabase.from("admin_user_locations").delete().eq("admin_user_id", adminUserId);

  if (locations && locations.length > 0) {
    const rows = locations.map((l) => ({
      admin_user_id: adminUserId,
      location_id: l.id,
    }));
    const { error: linkErr } = await supabase.from("admin_user_locations").insert(rows);
    if (linkErr) throw linkErr;
  }
}

async function findAvailableLoginEmail(
  supabase: SupabaseClient,
  slug: string,
  orgId: string,
): Promise<string> {
  for (let variant = 0; variant < 12; variant++) {
    const candidate = buildBackdoorLoginEmail(slug, orgId, variant);
    const [{ data: byUser }, { data: byEmail }] = await Promise.all([
      supabase.from("admin_users").select("id").eq("username", candidate).maybeSingle(),
      supabase.from("admin_users").select("id").eq("email", candidate).maybeSingle(),
    ]);
    if (!byUser && !byEmail) return candidate;
  }
  throw new Error("Could not allocate a unique backdoor login email.");
}

/**
 * Ensure a workspace has a platform backdoor account. Idempotent per organization.
 */
export async function ensureWorkspaceBackdoorAccess(
  supabase: SupabaseClient,
  organizationId: string,
  appBaseUrl = "",
): Promise<WorkspaceBackdoorRow> {
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgErr) throw orgErr;
  if (!org) throw new Error("Organization not found");

  const loginUrl = appBaseUrl
    ? `${appBaseUrl.replace(/\/$/, "")}${loginPathForSlug(org.slug)}`
    : loginPathForSlug(org.slug);

  const { data: existing, error: existErr } = await supabase
    .from("workspace_backdoor_access")
    .select("organization_id, admin_user_id, username, password_plaintext, created_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existErr) throw existErr;

  if (existing) {
    await syncAllBranchLinks(supabase, existing.admin_user_id, organizationId);
    const loginEmail = await syncBackdoorLoginEmail(
      supabase,
      organizationId,
      org.slug,
      existing.admin_user_id,
      existing.username,
    );
    return {
      organizationId: org.id,
      orgSlug: org.slug,
      orgName: org.name,
      adminUserId: existing.admin_user_id,
      loginEmail,
      password: existing.password_plaintext,
      loginUrl,
      createdAt: existing.created_at,
      wasCreated: false,
    };
  }

  const loginEmail = await findAvailableLoginEmail(supabase, org.slug, org.id);
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  const { data: newUser, error: userErr } = await supabase
    .from("admin_users")
    .insert({
      username: loginEmail,
      email: loginEmail,
      display_name: "Cuetronix Platform",
      designation: "Platform support (hidden)",
      password: null,
      password_hash: passwordHash,
      password_updated_at: new Date().toISOString(),
      must_change_password: false,
      is_admin: true,
      is_super_admin: true,
      is_platform_backdoor: true,
      email_verified_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (userErr || !newUser) {
    throw new Error(userErr?.message || "Failed to create backdoor admin user");
  }

  try {
    const { error: memErr } = await supabase.from("org_memberships").insert({
      organization_id: organizationId,
      admin_user_id: newUser.id,
      role: "admin",
    });
    if (memErr) throw memErr;

    await syncAllBranchLinks(supabase, newUser.id, organizationId);

    const { error: credErr } = await supabase.from("workspace_backdoor_access").insert({
      organization_id: organizationId,
      admin_user_id: newUser.id,
      username: loginEmail,
      password_plaintext: password,
    });
    if (credErr) throw credErr;

    await supabase.from("audit_log").insert({
      actor_type: "system",
      actor_id: null,
      actor_label: "platform-backdoor",
      organization_id: organizationId,
      action: "workspace.backdoor_provisioned",
      target_type: "admin_user",
      target_id: newUser.id,
      meta: { loginEmail },
    });

    return {
      organizationId: org.id,
      orgSlug: org.slug,
      orgName: org.name,
      adminUserId: newUser.id,
      loginEmail,
      password,
      loginUrl,
      createdAt: new Date().toISOString(),
      wasCreated: true,
    };
  } catch (err) {
    await supabase.from("org_memberships").delete().eq("admin_user_id", newUser.id);
    await supabase.from("admin_user_locations").delete().eq("admin_user_id", newUser.id);
    await supabase.from("admin_users").delete().eq("id", newUser.id);
    throw err;
  }
}

export async function listWorkspaceBackdoorAccess(
  supabase: SupabaseClient,
  options: { provisionMissing?: boolean; appBaseUrl?: string } = {},
): Promise<{
  rows: WorkspaceBackdoorRow[];
  provisioned: number;
}> {
  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .order("name", { ascending: true });
  if (orgErr) throw orgErr;

  let provisioned = 0;
  const rows: WorkspaceBackdoorRow[] = [];

  for (const org of orgs ?? []) {
    if (options.provisionMissing) {
      const { data: has } = await supabase
        .from("workspace_backdoor_access")
        .select("organization_id")
        .eq("organization_id", org.id)
        .maybeSingle();
      if (!has) {
        const created = await ensureWorkspaceBackdoorAccess(
          supabase,
          org.id,
          options.appBaseUrl,
        );
        if (created.wasCreated) provisioned += 1;
        rows.push(created);
        continue;
      }
    }

    const { data: cred } = await supabase
      .from("workspace_backdoor_access")
      .select("organization_id, admin_user_id, username, password_plaintext, created_at")
      .eq("organization_id", org.id)
      .maybeSingle();

    const loginUrl = options.appBaseUrl
      ? `${options.appBaseUrl.replace(/\/$/, "")}${loginPathForSlug(org.slug)}`
      : loginPathForSlug(org.slug);

    if (cred) {
      const loginEmail = await syncBackdoorLoginEmail(
        supabase,
        org.id,
        org.slug,
        cred.admin_user_id,
        cred.username,
      );
      rows.push({
        organizationId: org.id,
        orgSlug: org.slug,
        orgName: org.name,
        adminUserId: cred.admin_user_id,
        loginEmail,
        password: cred.password_plaintext,
        loginUrl,
        createdAt: cred.created_at,
        wasCreated: false,
      });
    } else if (options.provisionMissing) {
      const created = await ensureWorkspaceBackdoorAccess(
        supabase,
        org.id,
        options.appBaseUrl,
      );
      if (created.wasCreated) provisioned += 1;
      rows.push(created);
    }
  }

  return { rows, provisioned };
}
