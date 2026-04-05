import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  getEnv,
  j,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils";

export const config = { runtime: "edge" };

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getSupabaseUrl() {
  return getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || need("VITE_SUPABASE_URL");
}

function getSupabaseServiceRoleKey() {
  return getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
}

type Coupon = {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  enabled: boolean;
};

function normalizeCoupon(raw: unknown): Coupon | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const code = String(o.code || "").trim().toUpperCase();
  if (!code) return null;
  const discount_type = o.discount_type === "fixed" ? "fixed" : "percentage";
  const dv = o.discount_value;
  const discount_value =
    typeof dv === "number" && Number.isFinite(dv) ? dv : Number(dv) || 0;
  return {
    code,
    description: String(o.description ?? ""),
    discount_type,
    discount_value: Number.isFinite(discount_value) ? discount_value : 0,
    enabled: o.enabled !== false,
  };
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const cookies = parseCookies(req.headers.get("cookie"));
    const token = cookies[ADMIN_SESSION_COOKIE];
    const sessionUser = token ? await verifyAdminSession(token) : null;
    if (!sessionUser?.isAdmin) return j({ ok: false, error: "Unauthorized" }, 401);

    const serviceKey = getSupabaseServiceRoleKey();
    if (!serviceKey) {
      return j(
        {
          ok: false,
          error:
            "Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY (required to save booking settings).",
        },
        500
      );
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "cuephoria-admin-booking-settings" } },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "event") {
      const name = String(body?.name ?? "").trim() || "IIM Event";
      const description =
        String(body?.description ?? "").trim() ||
        "Choose VR (15m) or PS5 Gaming (30m)";
      const { error } = await supabase.from("booking_settings").upsert(
        {
          setting_key: "event_name",
          setting_value: { name, description },
          description: "Name and description for the special event booking category",
        },
        { onConflict: "setting_key" }
      );
      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    if (action === "coupons") {
      const raw = body?.coupons;
      if (!Array.isArray(raw)) {
        return j({ ok: false, error: "coupons must be an array" }, 400);
      }
      const coupons = raw.map(normalizeCoupon).filter((c): c is Coupon => c !== null);
      const { error } = await supabase.from("booking_settings").upsert(
        {
          setting_key: "booking_coupons",
          setting_value: coupons,
          description: "List of available coupon codes for bookings",
        },
        { onConflict: "setting_key" }
      );
      if (error) return j({ ok: false, error: error.message }, 500);
      return j({ ok: true }, 200);
    }

    return j({ ok: false, error: "Invalid action" }, 400);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("booking-settings API error:", err);
    return j({ ok: false, error: msg }, 500);
  }
}
