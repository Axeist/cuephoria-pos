import { ADMIN_SESSION_COOKIE, j, parseCookies, verifyAdminSession } from "../../src/server/adminApiUtils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    if (!token) return j({ ok: true, user: null }, 200);

    const user = await verifyAdminSession(token);
    return j({ ok: true, user }, 200);
  } catch (err: any) {
    console.error("Admin session check error:", err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}

