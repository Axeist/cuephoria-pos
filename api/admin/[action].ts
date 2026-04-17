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

import bookingSettings from "../../src/server/handlers/admin/booking-settings";
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
import users from "../../src/server/handlers/admin/users";
import verifyEmail from "../../src/server/handlers/admin/verify-email";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "booking-settings": bookingSettings,
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
  "users": users,
  "verify-email": verifyEmail,
};

export default async function dispatcher(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const action = pathname.split("/").filter(Boolean).pop() ?? "";
  const handler = routes[action];
  if (!handler) {
    return j({ ok: false, error: `Unknown admin action: ${action}` }, 404);
  }
  return handler(req);
}
