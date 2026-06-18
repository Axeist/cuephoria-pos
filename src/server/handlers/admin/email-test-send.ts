/**
 * POST /api/admin/email-test-send
 *
 * Sends a single generic transactional email to the signed-in admin's address
 * so operators can confirm Resend + from-domain are working.
 */

import {
  ADMIN_SESSION_COOKIE,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../adminApiUtils";
import { appBaseUrl, sendEmail } from "../../email";
import { resolveOrgContext } from "../../orgContext";
import { supabaseServiceClient } from "../../supabaseServer";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") return j({ ok: false, error: "Method not allowed" }, 405);

  const cookies = parseCookies(req.headers.get("cookie"));
  const session = await verifyAdminSession(cookies[ADMIN_SESSION_COOKIE] || "");
  if (!session) return j({ ok: false, error: "Unauthorized" }, 401);
  if (!session.isAdmin && !session.isSuperAdmin) {
    return j({ ok: false, error: "Only workspace administrators can send a test email." }, 403);
  }

  const supabase = supabaseServiceClient("cuetronix-email-test-send");

  const { data: user, error: userErr } = await supabase
    .from("admin_users")
    .select("id, username, email, display_name")
    .eq("id", session.id)
    .maybeSingle();
  if (userErr || !user?.email) {
    return j(
      {
        ok: false,
        error:
          user?.email == null
            ? "Add an email to your account before sending a test (Account or profile)."
            : userErr?.message || "Could not load your profile.",
      },
      400,
    );
  }

  const to = String(user.email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return j({ ok: false, error: "Your account email is not valid for delivery." }, 400);
  }

  const ctx = await resolveOrgContext(req);
  let organizationId: string | null = null;
  let organizationLabel: string | undefined;
  if (!("code" in ctx)) {
    organizationId = ctx.organizationId;
    organizationLabel = ctx.organizationSlug;
    try {
      const { data: orgRow } = await ctx.supabase
        .from("organizations")
        .select("name")
        .eq("id", ctx.organizationId)
        .maybeSingle();
      if (orgRow?.name) organizationLabel = orgRow.name as string;
    } catch {
      /* non-fatal */
    }
  }

  const base = appBaseUrl();
  const result = await sendEmail({
    kind: "generic",
    to,
    vars: {
      appBaseUrl: base,
      subject: "Cuetronix — transactional email test",
      heading: "Transactional email test",
      bodyHtml: `<p>This message confirms that <strong>Resend</strong> is configured for this deployment.</p>
        <p style="margin-top:12px">Sent from workspace settings. No action needed.</p>`,
      ctaLabel: "Open dashboard",
      ctaUrl: `${base}/settings`,
      displayName: (user.display_name as string | null) || user.username,
      organizationName: organizationLabel,
    },
    organizationId,
    adminUserId: user.id,
    supabase,
  });

  if (result.skipped) {
    return j(
      {
        ok: false,
        error: "Email not configured — set RESEND_API_KEY and RESEND_FROM on the server (see .env.example).",
        skipped: true,
      },
      200,
    );
  }
  if (!result.ok) {
    return j({ ok: false, error: result.error || "Resend rejected the send. Check Resend logs and domain verification." }, 502);
  }

  return j({ ok: true, to, resendId: result.id }, 200);
}
