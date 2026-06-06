/**
 * Catch-all dispatcher for /api/platform/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * platform endpoints are collapsed behind one dynamic route. Each concrete
 * handler still lives in its own module under src/server/handlers/platform/;
 * this file only maps URL path → module.
 */

import { runDispatcher } from "../../src/server/dispatcherUtils";

import audit from "../../src/server/handlers/platform/audit";
import backdoorAccess from "../../src/server/handlers/platform/backdoor-access";
import bootstrap from "../../src/server/handlers/platform/bootstrap";
import login from "../../src/server/handlers/platform/login";
import logout from "../../src/server/handlers/platform/logout";
import me from "../../src/server/handlers/platform/me";
import organizationAction from "../../src/server/handlers/platform/organization-action";
import organizationBranding from "../../src/server/handlers/platform/organization-branding";
import organizationDelete from "../../src/server/handlers/platform/organization-delete";
import organizationInviteOwner from "../../src/server/handlers/platform/organization-invite-owner";
import organizationMember from "../../src/server/handlers/platform/organization-member";
import organizationMemberMigrateEmail from "../../src/server/handlers/platform/organization-member-migrate-email";
import organization from "../../src/server/handlers/platform/organization";
import organizations from "../../src/server/handlers/platform/organizations";
import passwordMigrationStatus from "../../src/server/handlers/platform/password-migration-status";
import platformAdmins from "../../src/server/handlers/platform/platform-admins";
import planRazorpayMap from "../../src/server/handlers/platform/plan-razorpay-map";
import planUpdate from "../../src/server/handlers/platform/plan-update";
import plans from "../../src/server/handlers/platform/plans";
import settings from "../../src/server/handlers/platform/settings";
import stats from "../../src/server/handlers/platform/stats";
import broadcasts from "../../src/server/handlers/platform/broadcasts";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "audit": audit,
  "backdoor-access": backdoorAccess,
  "bootstrap": bootstrap,
  "login": login,
  "logout": logout,
  "me": me,
  "organization-action": organizationAction,
  "organization-branding": organizationBranding,
  "organization-delete": organizationDelete,
  "organization-invite-owner": organizationInviteOwner,
  "organization-member": organizationMember,
  "organization-member-migrate-email": organizationMemberMigrateEmail,
  "organization": organization,
  "organizations": organizations,
  "password-migration-status": passwordMigrationStatus,
  "platform-admins": platformAdmins,
  "plan-razorpay-map": planRazorpayMap,
  "plan-update": planUpdate,
  "plans": plans,
  "settings": settings,
  "stats": stats,
  "broadcasts": broadcasts,
};

export default async function dispatcher(req: Request): Promise<Response> {
  return runDispatcher(req, routes, "platform");
}
