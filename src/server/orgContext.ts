/**
 * orgContext — server-side organization-context helper (Slice 0 pilot).
 *
 * Purpose
 * -------
 * Resolves the active organization for every tenant-facing API handler, so
 * that business logic never has to trust the client for an org identifier
 * and never has to pick it up from ad-hoc query strings.
 *
 * Contract
 * --------
 * `withOrgContext(req, handler)` verifies the admin session cookie, looks up
 * the caller's organization (resolved through `org_memberships`), and passes
 * a resolved `OrgContext` to the handler. If resolution fails, a JSON error
 * response is returned and the handler is never invoked.
 *
 * Slice 0 posture
 * ---------------
 * - Does NOT enable RLS. Still uses the Supabase service role key server-side.
 * - Does NOT change any existing endpoint's behavior. One endpoint
 *   (`/api/admin/me`) is migrated as the pattern; all others continue to use
 *   the legacy `verifyAdminSession` flow and pick up org context later in
 *   Slice 1.
 * - Fails *open* in exactly one way: super admins without a membership row
 *   fall back to the Cuephoria org (slug = 'cuephoria'). This guarantees the
 *   live operation keeps working even if a rare backfill gap is discovered.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  type AdminSessionUser,
  getEnv,
  isSessionRevoked,
  j,
  parseCookies,
  verifyAdminSession,
} from "./adminApiUtils";

export type OrgMembershipRole = "owner" | "admin" | "manager" | "staff" | "read_only";

export type OrgContext = {
  /** The authenticated admin user (tenant-facing, not platform admin). */
  user: AdminSessionUser;
  /** Active organization id. Always present when the handler runs. */
  organizationId: string;
  /** Active organization slug (for logs and URL generation). */
  organizationSlug: string;
  /** Whether this organization is the internal Cuephoria org (bypasses gates). */
  isInternal: boolean;
  /** The caller's role inside the active organization. */
  role: OrgMembershipRole;
  /** A service-role Supabase client tagged for observability. */
  supabase: SupabaseClient;
};

export type OrgContextError = {
  code: "unauthorized" | "no_org" | "config" | "db";
  status: number;
  message: string;
};

function supabaseUrl(): string {
  const v = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  if (!v) throw new Error("Missing env: SUPABASE_URL / VITE_SUPABASE_URL");
  return v;
}

function supabaseServiceRoleKey(): string {
  const v = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!v) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return v;
}

function serviceClient(): SupabaseClient {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-api" } },
  });
}

/**
 * Resolve the org context for a request. Returns either a fully-populated
 * OrgContext or a structured error. The caller is expected to short-circuit
 * and return an appropriate response on error.
 */
export async function resolveOrgContext(
  req: Request,
  opts: { requestedOrgSlug?: string } = {},
): Promise<OrgContext | OrgContextError> {
  let user: AdminSessionUser | null = null;
  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    user = token ? await verifyAdminSession(token) : null;
  } catch {
    user = null;
  }

  if (!user) {
    return {
      code: "unauthorized",
      status: 401,
      message: "Unauthorized",
    };
  }

  let supabase: SupabaseClient;
  try {
    supabase = serviceClient();
  } catch (err) {
    return {
      code: "config",
      status: 500,
      message: err instanceof Error ? err.message : "Server misconfigured",
    };
  }

  // Slice 5: reject sessions whose password_version has drifted. This is the
  // only place every tenant-scoped API call flows through, so enforcing here
  // kills revoked cookies globally (POSTs, PATCHes, deletes — not just /me).
  if (await isSessionRevoked(user, supabase)) {
    return {
      code: "unauthorized",
      status: 401,
      message: "Session revoked. Please sign in again.",
    };
  }

  // Candidate orgs via membership.
  const { data: memberships, error: memErr } = await supabase
    .from("org_memberships")
    .select("organization_id, role, organizations:organization_id (id, slug, is_internal)")
    .eq("admin_user_id", user.id);

  if (memErr) {
    return { code: "db", status: 500, message: memErr.message };
  }

  type MembershipRow = {
    organization_id: string;
    role: OrgMembershipRole;
    organizations:
      | { id: string; slug: string; is_internal: boolean }
      | Array<{ id: string; slug: string; is_internal: boolean }>
      | null;
  };

  const rows = (memberships || []) as unknown as MembershipRow[];

  const flat = rows.flatMap((r) => {
    const o = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
    if (!o) return [];
    return [{
      id: o.id,
      slug: o.slug,
      isInternal: !!o.is_internal,
      role: r.role,
    }];
  });

  let picked = flat[0];

  if (opts.requestedOrgSlug) {
    const match = flat.find((m) => m.slug === opts.requestedOrgSlug);
    if (match) picked = match;
  }

  // Fail-open for super admins with no membership row: fall back to the
  // Cuephoria internal org so the live operation always resolves.
  if (!picked && user.isSuperAdmin) {
    const { data: cue, error: cueErr } = await supabase
      .from("organizations")
      .select("id, slug, is_internal")
      .eq("slug", "cuephoria")
      .maybeSingle();
    if (cueErr) return { code: "db", status: 500, message: cueErr.message };
    if (cue) {
      picked = { id: cue.id, slug: cue.slug, isInternal: !!cue.is_internal, role: "owner" };
    }
  }

  if (!picked) {
    return {
      code: "no_org",
      status: 403,
      message: "No organization membership. Contact your workspace owner.",
    };
  }

  return {
    user,
    organizationId: picked.id,
    organizationSlug: picked.slug,
    isInternal: picked.isInternal,
    role: picked.role,
    supabase,
  };
}

/**
 * Higher-order handler wrapper. Use this in edge API routes that need a
 * resolved OrgContext. Example:
 *
 *   export default withOrgContext(async (req, ctx) => {
 *     const { data } = await ctx.supabase.from("locations")...;
 *     return j({ ok: true, data });
 *   });
 */
export function withOrgContext(
  handler: (req: Request, ctx: OrgContext) => Promise<Response> | Response,
) {
  return async function wrapped(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const requestedOrgSlug = url.searchParams.get("org") || undefined;
    const result = await resolveOrgContext(req, { requestedOrgSlug });
    if ("code" in result) {
      return j({ ok: false, error: result.message, code: result.code }, result.status);
    }
    return handler(req, result);
  };
}

/**
 * Narrow helper for reading plan features for the active org. Used later in
 * Slice 5 to enforce tier limits. Exposed here so any endpoint can cheaply
 * check an entitlement key without reimplementing the lookup.
 */
export async function getPlanFeature<T = unknown>(
  ctx: OrgContext,
  key: string,
): Promise<T | null> {
  if (ctx.isInternal) {
    // Internal Cuephoria org has all features on; surface a permissive default.
    // Callers that need specific shapes should still fall back to sensible
    // values when the return type doesn't match.
    return null;
  }

  const { data: sub } = await ctx.supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (!sub?.plan_id) return null;

  const { data: feat } = await ctx.supabase
    .from("plan_features")
    .select("value")
    .eq("plan_id", sub.plan_id)
    .eq("key", key)
    .maybeSingle();

  return (feat?.value as T | undefined) ?? null;
}
