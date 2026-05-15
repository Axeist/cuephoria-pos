/**
 * POST /api/tenant/signup — disabled.
 *
 * New workspaces must be created via Google OAuth: `/signup` →
 * `/api/auth/google/start?intent=signup` → `/signup/google` → POST `/api/tenant/signup-google`.
 */

import { j } from "../../adminApiUtils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }
  return j(
    {
      ok: false,
      error:
        "Password signup is no longer available. Use Continue with Google on the signup page to create a workspace.",
    },
    403,
  );
}
