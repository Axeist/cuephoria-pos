/**
 * Catch-all dispatcher for /api/admin/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * admin endpoints are collapsed behind one dynamic route. Each concrete
 * handler still lives in its own module under src/server/handlers/admin/;
 * this file only maps URL path → module.
 *
 *   POST /api/admin/login            → handlers/admin/login
 *   POST /api/admin/logout           → handlers/admin/logout
 *   GET  /api/admin/me               → handlers/admin/me
 *   ...
 *
 * Static imports are required because the edge runtime does not support
 * dynamic `import()` of local files at runtime.
 */

import { j } from "../../src/server/adminApiUtils";
import { runDispatcher } from "../../src/server/dispatcherUtils";
import { verifyAdminCsrf } from "../../src/server/lib/csrf";

import aiChat from "../../src/server/handlers/admin/ai-chat";
import emailHealth from "../../src/server/handlers/admin/email-health";
import emailTestSend from "../../src/server/handlers/admin/email-test-send";
import bookingSettings from "../../src/server/handlers/admin/booking-settings";
import locationSettings from "../../src/server/handlers/admin/location-settings";
import paymentConfig from "../../src/server/handlers/admin/payment-config";
import changePassword from "../../src/server/handlers/admin/change-password";
import forgotPassword from "../../src/server/handlers/admin/forgot-password";
import locations from "../../src/server/handlers/admin/locations";
import loginLogs from "../../src/server/handlers/admin/login-logs";
import login from "../../src/server/handlers/admin/login";
import logout from "../../src/server/handlers/admin/logout";
import me from "../../src/server/handlers/admin/me";
import resetPassword from "../../src/server/handlers/admin/reset-password";
import sendVerification from "../../src/server/handlers/admin/send-verification";
import totp from "../../src/server/handlers/admin/totp";
import staffHr from "../../src/server/handlers/admin/staff-hr";
import staffPortal from "../../src/server/handlers/admin/staff-portal";
import permissions from "../../src/server/handlers/admin/permissions";
import roles from "../../src/server/handlers/admin/roles";
import users from "../../src/server/handlers/admin/users";
import stationMigrate from "../../src/server/handlers/admin/station-migrate";
import verifyPin from "../../src/server/handlers/admin/verify-pin";
import verifyEmail from "../../src/server/handlers/admin/verify-email";
import records from "../../src/server/handlers/admin/records";
import analytics from "../../src/server/handlers/admin/analytics";
import ops from "../../src/server/handlers/admin/ops";
import memberships from "../../src/server/handlers/admin/memberships";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "ai-chat": aiChat,
  "email-health": emailHealth,
  "email-test-send": emailTestSend,
  "booking-settings": bookingSettings,
  "location-settings": locationSettings,
  "payment-config": paymentConfig,
  "change-password": changePassword,
  "forgot-password": forgotPassword,
  "locations": locations,
  "login-logs": loginLogs,
  "login": login,
  "logout": logout,
  "me": me,
  "reset-password": resetPassword,
  "send-verification": sendVerification,
  "totp": totp,
  "staff-hr": staffHr,
  "staff-portal": staffPortal,
  "permissions": permissions,
  "roles": roles,
  "users": users,
  "verify-email": verifyEmail,
  "station-migrate": stationMigrate,
  "verify-pin": verifyPin,
  "records": records,
  "analytics": analytics,
  "ops": ops,
  "memberships": memberships,
};

export default async function dispatcher(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  const csrf = verifyAdminCsrf(req, segment);
  if (csrf.ok === false) {
    return j({ ok: false, error: csrf.error }, 403);
  }
  return runDispatcher(req, routes, "admin");
}
