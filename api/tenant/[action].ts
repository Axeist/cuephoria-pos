/**
 * Catch-all dispatcher for /api/tenant/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * eight tenant endpoints are collapsed behind one dynamic route. Each concrete
 * handler still lives in its own module under src/server/handlers/tenant/;
 * several of those modules are already wrapped in `withOrgContext` and
 * therefore export a plain (req) => Response default, so the dispatcher needs
 * no special-casing.
 */

import { j } from "../../src/server/adminApiUtils";

import billing from "../../src/server/handlers/tenant/billing";
import brandingUpload from "../../src/server/handlers/tenant/branding-upload";
import branding from "../../src/server/handlers/tenant/branding";
import onboarding from "../../src/server/handlers/tenant/onboarding";
import onboardingBootstrap from "../../src/server/handlers/tenant/onboarding-bootstrap";
import organization from "../../src/server/handlers/tenant/organization";
import signupGoogleIdentity from "../../src/server/handlers/tenant/signup-google-identity";
import signupGoogle from "../../src/server/handlers/tenant/signup-google";
import signup from "../../src/server/handlers/tenant/signup";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "billing": billing,
  "branding-upload": brandingUpload,
  "branding": branding,
  "onboarding": onboarding,
  "onboarding-bootstrap": onboardingBootstrap,
  "organization": organization,
  "signup-google-identity": signupGoogleIdentity,
  "signup-google": signupGoogle,
  "signup": signup,
};

export default async function dispatcher(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const action = pathname.split("/").filter(Boolean).pop() ?? "";
  const handler = routes[action];
  if (!handler) {
    return j({ ok: false, error: `Unknown tenant action: ${action}` }, 404);
  }
  return handler(req);
}
