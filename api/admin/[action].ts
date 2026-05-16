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

import { runDispatcher } from "../../src/server/dispatcherUtils";

import aiChat from "../../src/server/handlers/admin/ai-chat";
import emailHealth from "../../src/server/handlers/admin/email-health";
import emailTestSend from "../../src/server/handlers/admin/email-test-send";
import bookingSettings from "../../src/server/handlers/admin/booking-settings";
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
import users from "../../src/server/handlers/admin/users";
import verifyEmail from "../../src/server/handlers/admin/verify-email";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "ai-chat": aiChat,
  "email-health": emailHealth,
  "email-test-send": emailTestSend,
  "booking-settings": bookingSettings,
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
  "users": users,
  "verify-email": verifyEmail,
};

export default async function dispatcher(req: Request): Promise<Response> {
  return runDispatcher(req, routes, "admin");
}
