/**
 * GET /api/platform/me
 * Returns the current platform admin session, or 401 if unauthenticated.
 */

import { j } from "../../src/server/adminApiUtils";
import { getPlatformSession } from "../../src/server/platformApiUtils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);
  const session = await getPlatformSession(req);
  if (!session) return j({ ok: true, admin: null }, 200);
  return j(
    {
      ok: true,
      admin: {
        id: session.id,
        email: session.email,
        displayName: session.displayName,
      },
    },
    200,
  );
}
