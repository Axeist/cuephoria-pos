/**
 * Catch-all dispatcher for /api/platform/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * fifteen platform endpoints are collapsed behind one dynamic route. Each
 * concrete handler still lives in its own module under
 * src/server/handlers/platform/; this file only maps URL path → module.
 */

import { j } from "../../src/server/adminApiUtils";

import audit from "../../src/server/handlers/platform/audit";
import bootstrap from "../../src/server/handlers/platform/bootstrap";
import login from "../../src/server/handlers/platform/login";
import logout from "../../src/server/handlers/platform/logout";
import me from "../../src/server/handlers/platform/me";
import organizationAction from "../../src/server/handlers/platform/organization-action";
import organizationBranding from "../../src/server/handlers/platform/organization-branding";
import organizationInviteOwner from "../../src/server/handlers/platform/organization-invite-owner";
import organizationMember from "../../src/server/handlers/platform/organization-member";
import organization from "../../src/server/handlers/platform/organization";
import organizations from "../../src/server/handlers/platform/organizations";
import passwordMigrationStatus from "../../src/server/handlers/platform/password-migration-status";
import planRazorpayMap from "../../src/server/handlers/platform/plan-razorpay-map";
import plans from "../../src/server/handlers/platform/plans";
import stats from "../../src/server/handlers/platform/stats";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "audit": audit,
  "bootstrap": bootstrap,
  "login": login,
  "logout": logout,
  "me": me,
  "organization-action": organizationAction,
  "organization-branding": organizationBranding,
  "organization-invite-owner": organizationInviteOwner,
  "organization-member": organizationMember,
  "organization": organization,
  "organizations": organizations,
  "password-migration-status": passwordMigrationStatus,
  "plan-razorpay-map": planRazorpayMap,
  "plans": plans,
  "stats": stats,
};

export default async function dispatcher(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const action = pathname.split("/").filter(Boolean).pop() ?? "";
  const handler = routes[action];
  if (!handler) {
    return j({ ok: false, error: `Unknown platform action: ${action}` }, 404);
  }
  return handler(req);
}
