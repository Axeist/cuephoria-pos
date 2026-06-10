/**
 * Catch-all dispatcher for /api/tenant/* routes.
 *
 * Vercel's Hobby tier caps the deployment at 12 Serverless Functions, so the
 * eight tenant endpoints are collapsed behind one dynamic route. Each concrete
 * handler still lives in its own module under src/server/handlers/tenant/;
 * several of those modules are already wrapped in `withOrgContext` and
 * therefore export a plain (req) => Response default, so the dispatcher needs
 * no special-casing.
 *
 * Billing is intentionally NOT routed here — it is implemented only in
 * `api/tenant/billing.ts` (Node + Razorpay SDK). See `api/bookings/[action].ts`
 * note: concrete sibling files resolve before `[action]`; importing a second
 * copy here risks divergent behaviour and wastes a function bundle.
 */

import { runDispatcher } from "../../src/server/dispatcherUtils";

import brandingUpload from "../../src/server/handlers/tenant/branding-upload";
import branding from "../../src/server/handlers/tenant/branding";
import onboarding from "../../src/server/handlers/tenant/onboarding";
import onboardingBootstrap from "../../src/server/handlers/tenant/onboarding-bootstrap";
import organization from "../../src/server/handlers/tenant/organization";
import bookingPopups from "../../src/server/handlers/tenant/booking-popups";
import bookingSlotConfig from "../../src/server/handlers/tenant/booking-slot-config";
import locations from "../../src/server/handlers/tenant/locations";
import signupGoogleIdentity from "../../src/server/handlers/tenant/signup-google-identity";
import signupGoogle from "../../src/server/handlers/tenant/signup-google";
import signup from "../../src/server/handlers/tenant/signup";

export const config = { runtime: "edge" };

type Handler = (req: Request) => Promise<Response> | Response;

const routes: Record<string, Handler> = {
  "branding-upload": brandingUpload,
  "branding": branding,
  "onboarding": onboarding,
  "onboarding-bootstrap": onboardingBootstrap,
  "organization": organization,
  "booking-popups": bookingPopups,
  "booking-slot-config": bookingSlotConfig,
  "locations": locations,
  "signup-google-identity": signupGoogleIdentity,
  "signup-google": signupGoogle,
  "signup": signup,
};

export default async function dispatcher(req: Request): Promise<Response> {
  return runDispatcher(req, routes, "tenant");
}
