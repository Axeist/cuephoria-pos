import { ADMIN_SESSION_COOKIE, cookieSerialize, j } from "../../src/server/adminApiUtils";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  const expired = cookieSerialize(ADMIN_SESSION_COOKIE, "", {
    maxAgeSeconds: 0,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });

  return j({ ok: true }, 200, { "set-cookie": expired });
}

