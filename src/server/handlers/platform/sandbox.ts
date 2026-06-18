/**
 * /api/platform/sandbox
 *
 * GET  — list demo sandbox access grants
 * POST — create grant | revoke grant (op=revoke)
 *
 * Platform session required.
 */

import { j } from "../../adminApiUtils";
import { hashPassword } from "../../passwordUtils";
import { supabaseServiceClient, SupabaseConfigError } from "../../supabaseServer";
import { requirePlatformSession } from "../../platformApiUtils";
import { seedSandboxWorkspace } from "../../sandbox/seedSandboxWorkspace";

export const config = { runtime: "edge" };

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
const SANDBOX_DAYS = 7;

function generatePassword(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return out;
}

function appBaseUrl(req: Request): string {
  const env = process.env.APP_BASE_URL || process.env.VITE_APP_URL || "";
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "";
}

function randomSlug(): string {
  const tail = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `demo-${tail}`;
}

async function listGrants(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-sandbox-list");
    const { data: rows, error } = await supabase
      .from("sandbox_access_grants")
      .select(
        `
        id,
        client_name,
        client_email,
        client_phone,
        expires_at,
        revoked_at,
        created_at,
        organization_id,
        admin_user_id,
        organizations:organization_id ( slug, name, is_sandbox ),
        admin_users:admin_user_id ( email, username )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      if (error.message?.includes("sandbox_access_grants")) {
        return j(
          {
            ok: false,
            migrationRequired: true,
            error: "Apply migration 20260809120000_plan_entitlements_and_sandbox.sql",
            grants: [],
          },
          503,
        );
      }
      return j({ ok: false, error: error.message }, 500);
    }

    const now = Date.now();
    const grants = (rows ?? []).map((row) => {
      type OrgEmbed = { slug?: string; name?: string };
      type UserEmbed = { email?: string; username?: string };
      const orgRaw = (row as { organizations?: OrgEmbed | OrgEmbed[] | null }).organizations;
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
      const userRaw = (row as { admin_users?: UserEmbed | UserEmbed[] | null }).admin_users;
      const user = Array.isArray(userRaw) ? userRaw[0] : userRaw;
      const expiresMs = new Date(String(row.expires_at)).getTime();
      const revoked = !!row.revoked_at;
      const expired = Number.isFinite(expiresMs) && expiresMs <= now;
      return {
        id: row.id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        clientPhone: row.client_phone,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        createdAt: row.created_at,
        organizationId: row.organization_id,
        orgSlug: org?.slug ?? null,
        orgName: org?.name ?? null,
        loginEmail: user?.email ?? user?.username ?? row.client_email,
        status: revoked ? "revoked" : expired ? "expired" : "active",
        loginUrl: org?.slug ? `${appBaseUrl(req)}/login?org=${encodeURIComponent(org.slug)}` : null,
      };
    });

    return j({ ok: true, grants }, 200);
  } catch (err: unknown) {
    console.error("platform/sandbox list error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

async function createGrant(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return j({ ok: false, error: "Expected JSON body." }, 415);
  }

  let body: { clientName?: string; clientEmail?: string; clientPhone?: string };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim().toLowerCase();
  const clientPhone = String(body.clientPhone ?? "").trim() || null;

  if (clientName.length < 2) return j({ ok: false, error: "Client name is required." }, 400);
  if (!clientEmail.includes("@")) return j({ ok: false, error: "Valid client email is required." }, 400);

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-sandbox-create");
    const password = generatePassword();
    const passwordHash = await hashPassword(password);

    let slug = randomSlug();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: taken } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle();
      if (!taken) break;
      slug = randomSlug();
    }
    if (!SLUG_RE.test(slug)) {
      return j({ ok: false, error: "Could not generate a valid workspace slug." }, 500);
    }

    const orgName = `${clientName} Demo`;
    const expiresAt = new Date(Date.now() + SANDBOX_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: proPlan } = await supabase
      .from("plans")
      .select("id, code")
      .eq("code", "pro")
      .maybeSingle();
    if (!proPlan?.id) return j({ ok: false, error: "Pro plan not found in database." }, 500);

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        slug,
        name: orgName,
        country: "IN",
        currency: "INR",
        timezone: "Asia/Kolkata",
        status: "active",
        is_internal: false,
        is_sandbox: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (orgErr || !org) return j({ ok: false, error: orgErr?.message ?? "Failed to create org" }, 500);

    const rollbackOrg = async () => {
      await supabase.from("organizations").delete().eq("id", org.id);
    };

    const { error: subErr } = await supabase.from("subscriptions").insert({
      organization_id: org.id,
      plan_id: proPlan.id,
      plan_tier: "pro",
      provider: "manual",
      status: "active",
      interval: "month",
    });
    if (subErr) {
      await rollbackOrg();
      return j({ ok: false, error: subErr.message }, 500);
    }

    const { error: locErr } = await supabase.from("locations").insert({
      organization_id: org.id,
      name: "Demo Branch",
      slug: "main",
      short_code: "DEMO",
      sort_order: 0,
      is_active: true,
    });
    if (locErr) {
      await rollbackOrg();
      return j({ ok: false, error: locErr.message }, 500);
    }

    const loginEmail = clientEmail;
    const { data: adminUser, error: userErr } = await supabase
      .from("admin_users")
      .insert({
        username: loginEmail,
        email: loginEmail,
        display_name: clientName,
        password_hash: passwordHash,
        password_updated_at: new Date().toISOString(),
        is_admin: true,
        is_super_admin: false,
        is_sandbox_user: true,
        email_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (userErr || !adminUser) {
      await rollbackOrg();
      return j({ ok: false, error: userErr?.message ?? "Failed to create demo user" }, 500);
    }

    const { data: locationRow } = await supabase
      .from("locations")
      .select("id")
      .eq("organization_id", org.id)
      .limit(1)
      .maybeSingle();

    await supabase.from("org_memberships").insert({
      organization_id: org.id,
      admin_user_id: adminUser.id,
      role: "owner",
    });

    if (locationRow?.id) {
      await supabase.from("admin_user_locations").insert({
        admin_user_id: adminUser.id,
        location_id: locationRow.id,
      });
    }

    const { data: grant, error: grantErr } = await supabase
      .from("sandbox_access_grants")
      .insert({
        organization_id: org.id,
        admin_user_id: adminUser.id,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        expires_at: expiresAt,
        created_by_platform_admin_id: session.id,
      })
      .select("*")
      .single();
    if (grantErr) {
      await supabase.from("admin_users").delete().eq("id", adminUser.id);
      await rollbackOrg();
      return j({ ok: false, error: grantErr.message }, 500);
    }

    await seedSandboxWorkspace(supabase, org.id);

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: org.id,
      action: "sandbox.grant_created",
      target_type: "organization",
      target_id: org.id,
      meta: { clientName, clientEmail, expiresAt },
    });

    const loginUrl = `${appBaseUrl(req)}/login?org=${encodeURIComponent(slug)}`;

    return j(
      {
        ok: true,
        grant: {
          id: grant.id,
          organizationId: org.id,
          orgSlug: slug,
          orgName,
          clientName,
          clientEmail,
          expiresAt,
          loginEmail,
          password,
          loginUrl,
        },
      },
      201,
    );
  } catch (err: unknown) {
    console.error("platform/sandbox create error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

async function revokeGrant(req: Request): Promise<Response> {
  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;
  const session = sessionOrResp;

  let body: { grantId?: string };
  try {
    body = await req.json();
  } catch {
    return j({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const grantId = String(body.grantId ?? "").trim();
  if (!grantId) return j({ ok: false, error: "grantId is required." }, 400);

  try {
    const supabase = supabaseServiceClient("cuetronix-platform-sandbox-revoke");
    const { data: grant, error: fetchErr } = await supabase
      .from("sandbox_access_grants")
      .select("id, organization_id, revoked_at")
      .eq("id", grantId)
      .maybeSingle();
    if (fetchErr) return j({ ok: false, error: fetchErr.message }, 500);
    if (!grant) return j({ ok: false, error: "Grant not found." }, 404);
    if (grant.revoked_at) return j({ ok: true, noop: true }, 200);

    const { error: updErr } = await supabase
      .from("sandbox_access_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grantId);
    if (updErr) return j({ ok: false, error: updErr.message }, 500);

    await supabase.from("audit_log").insert({
      actor_type: "platform_admin",
      actor_id: session.id,
      actor_label: session.email,
      organization_id: grant.organization_id,
      action: "sandbox.grant_revoked",
      target_type: "sandbox_access_grant",
      target_id: grantId,
      meta: {},
    });

    return j({ ok: true }, 200);
  } catch (err: unknown) {
    console.error("platform/sandbox revoke error:", err);
    if (err instanceof SupabaseConfigError) return j({ ok: false, error: err.message }, 503);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "GET") return listGrants(req);
  if (req.method === "POST") {
    const url = new URL(req.url);
    const op = url.searchParams.get("op")?.toLowerCase();
    if (op === "revoke") return revokeGrant(req);
    return createGrant(req);
  }
  return j({ ok: false, error: "Method not allowed" }, 405);
}
