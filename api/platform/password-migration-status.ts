/**
 * GET /api/platform/password-migration-status
 *
 * Reports how many admin_users are still on legacy plaintext passwords vs.
 * the modern PBKDF2 hash. Used by the platform dashboard to know when it is
 * safe to drop the legacy `password` column permanently.
 *
 * Response:
 *   {
 *     ok: true,
 *     status: {
 *       total: number,           // all admin_users
 *       hashed: number,          // have password_hash set
 *       plaintextRemaining: number, // still have password, no hash
 *       migratedPct: number,     // 0..100
 *     }
 *   }
 *
 * Security: platform session required. Never returns any username, id, or
 * organization linkage — strictly aggregate numbers.
 */

import { createClient } from "@supabase/supabase-js";
import { getEnv, j } from "../../src/server/adminApiUtils";
import { requirePlatformSession } from "../../src/server/platformApiUtils";

export const config = { runtime: "edge" };

function service() {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("Supabase service env vars missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "cuetronix-pwd-migration" } },
  });
}

export default async function handler(req: Request) {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const sessionOrResp = await requirePlatformSession(req);
  if (sessionOrResp instanceof Response) return sessionOrResp;

  try {
    const supabase = service();

    // Use HEAD counts for each bucket — O(small number of fast queries),
    // avoids ever pulling the full row set.
    const totalQuery = supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true });
    const hashedQuery = supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .not("password_hash", "is", null);
    const plaintextQuery = supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .is("password_hash", null)
      .not("password", "is", null);

    const [totalRes, hashedRes, plaintextRes] = await Promise.all([
      totalQuery,
      hashedQuery,
      plaintextQuery,
    ]);

    if (totalRes.error) return j({ ok: false, error: totalRes.error.message }, 500);
    if (hashedRes.error) return j({ ok: false, error: hashedRes.error.message }, 500);
    if (plaintextRes.error) return j({ ok: false, error: plaintextRes.error.message }, 500);

    const total = totalRes.count ?? 0;
    const hashed = hashedRes.count ?? 0;
    const plaintextRemaining = plaintextRes.count ?? 0;
    const migratedPct = total === 0 ? 100 : Math.round((hashed / total) * 1000) / 10;

    return j(
      {
        ok: true,
        status: {
          total,
          hashed,
          plaintextRemaining,
          migratedPct,
        },
      },
      200,
    );
  } catch (err: unknown) {
    console.error("platform/password-migration-status error:", err);
    return j({ ok: false, error: String((err as Error)?.message || err) }, 500);
  }
}
