/**
 * Catch-all dispatcher for /api/razorpay/* routes that DON'T have a
 * concrete sibling file in this directory.
 *
 *   GET      /api/razorpay/test-credentials      → Edge (platform env keys)
 *   POST     /api/razorpay/test-org-credentials  → Node (tenant keys, inline)
 *   GET/POST /api/razorpay/reconcile             → Node (cron)
 */

import { createClient } from "@supabase/supabase-js";
import {
  ADMIN_SESSION_COOKIE,
  parseCookies,
  verifyAdminSession,
} from "../../src/server/adminApiUtils.js";
import {
  callEdgeHandler,
  getAction,
  type EdgeHandler,
  type NodeHandler,
  type VercelRequest,
  type VercelResponse,
} from "../../src/server/lib/node-dispatcher.js";

import reconcileHandler from "../../src/server/handlers/razorpay/reconcile.js";
import testCredentialsHandler from "../../src/server/handlers/razorpay/test-credentials.js";
import { findStoredCredentialSlot } from "../../src/server/lib/payment-credential-slots.js";
import { decryptSecret } from "../../src/server/lib/payment-secrets.js";
import type { PaymentMode } from "../../src/server/lib/payment-provider.js";

export const config = {
  maxDuration: 30,
};

type DispatchEntry =
  | { kind: "node"; handler: NodeHandler }
  | { kind: "edge"; handler: EdgeHandler };

const ROUTES: Record<string, DispatchEntry> = {
  reconcile: { kind: "node", handler: reconcileHandler as unknown as NodeHandler },
  "test-credentials": { kind: "edge", handler: testCredentialsHandler as unknown as EdgeHandler },
};

function readHeader(req: VercelRequest, name: string): string {
  const v = req.headers?.[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] || "";
  return (v as string | undefined) || "";
}

function jsonRes(res: VercelResponse, data: unknown, status = 200) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function normalizeCredential(value: string): string {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

/** Tenant Razorpay credential test — inlined to avoid heavy handler import graph on Vercel. */
async function handleTestOrgCredentials(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return jsonRes(res, {}, 200);
  if (req.method !== "POST") return jsonRes(res, { ok: false, error: "Method not allowed" }, 405);

  try {
    const cookies = parseCookies(readHeader(req, "cookie"));
    const user = await verifyAdminSession(cookies[ADMIN_SESSION_COOKIE] || "");
    if (!user) return jsonRes(res, { ok: false, error: "Unauthorized" }, 401);
    if (!user.isAdmin) {
      return jsonRes(res, { ok: false, error: "Only admins can test payment gateways." }, 403);
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return jsonRes(res, { ok: false, error: "Server misconfigured (Supabase)." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: membership, error: memErr } = await supabase
      .from("org_memberships")
      .select("organization_id")
      .eq("admin_user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (memErr) return jsonRes(res, { ok: false, error: memErr.message }, 500);

    const orgId = (membership as { organization_id?: string } | null)?.organization_id;
    if (!orgId) {
      return jsonRes(res, { ok: false, error: "No organization membership found." }, 403);
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawCreds = body.credentials;
    const requestedMode: PaymentMode =
      body.mode === "live" || body.mode === "test" ? body.mode : "test";

    let keyId = "";
    let keySecret = "";

    if (rawCreds && typeof rawCreds === "object") {
      const creds = rawCreds as Record<string, unknown>;
      keyId = normalizeCredential(String(creds.key_id ?? ""));
      keySecret = normalizeCredential(String(creds.key_secret ?? ""));
    } else {
      const { data: configRow, error: configErr } = await supabase
        .from("payment_gateway_configs")
        .select("mode, settings")
        .eq("organization_id", orgId)
        .eq("provider", "razorpay")
        .maybeSingle();
      if (configErr) return jsonRes(res, { ok: false, error: configErr.message }, 500);

      const row = configRow as { mode?: PaymentMode; settings?: Record<string, unknown> } | null;
      const stored = findStoredCredentialSlot(
        (row?.settings ?? {}) as {
          credentials?: Partial<
            Record<PaymentMode, { key_id?: string; key_secret_enc?: string }>
          >;
        },
        requestedMode ?? row?.mode,
      );
      if (!stored?.creds.key_id || !stored.creds.key_secret_enc) {
        return jsonRes(res, {
          ok: true,
          result: {
            ok: false,
            message: "No saved workspace credentials found. Use Edit credentials to re-enter your API keys.",
          },
        });
      }
      try {
        keyId = normalizeCredential(stored.creds.key_id);
        keySecret = normalizeCredential(await decryptSecret(stored.creds.key_secret_enc));
      } catch (decryptErr) {
        return jsonRes(res, {
          ok: true,
          result: {
            ok: false,
            message:
              decryptErr instanceof Error
                ? decryptErr.message
                : "Could not read saved credentials. Re-enter your API keys in Edit credentials.",
          },
        });
      }
    }

    if (!keyId || !keySecret) {
      return jsonRes(res, {
        ok: true,
        result: { ok: false, message: "Key ID and Secret are required." },
      });
    }

    const mode = keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : null;
    if (!mode) {
      return jsonRes(res, {
        ok: true,
        result: {
          ok: false,
          message: "Key ID must start with rzp_test_ (test) or rzp_live_ (live).",
        },
      });
    }

    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    await razorpay.orders.create({
      amount: 100,
      currency: "INR",
      receipt: `cuetronix-test-${Date.now()}`.slice(0, 40),
    });

    const { data: existing } = await supabase
      .from("payment_gateway_configs")
      .select("settings")
      .eq("organization_id", orgId)
      .eq("provider", "razorpay")
      .maybeSingle();
    const prevSettings = ((existing as { settings?: Record<string, unknown> } | null)?.settings ??
      {}) as Record<string, unknown>;
    await supabase.from("payment_gateway_configs").upsert(
      {
        organization_id: orgId,
        provider: "razorpay",
        mode,
        settings: { ...prevSettings, last_credential_test_at: new Date().toISOString() },
      },
      { onConflict: "organization_id,provider" },
    );

    return jsonRes(res, {
      ok: true,
      provider: "razorpay",
      result: { ok: true, message: `Razorpay credentials are valid in ${mode} mode.` },
    });
  } catch (err: unknown) {
    const e = err as { error?: { description?: string }; message?: string; statusCode?: number };
    const body = (req.body ?? {}) as { credentials?: { key_id?: string }; mode?: string };
    const modeHint =
      String(body.credentials?.key_id ?? "").startsWith("rzp_live_") || body.mode === "live"
        ? "live"
        : "test";
    const detail =
      e?.error?.description ||
      e?.message ||
      "Authentication failed — check that Key ID and Secret are a matching pair from Razorpay Dashboard.";
    console.error("[test-org-credentials]", err);
    return jsonRes(res, {
      ok: true,
      provider: "razorpay",
      result: {
        ok: false,
        message: `Razorpay auth failed (${e?.statusCode ?? "error"}, ${modeHint}): ${detail}`,
      },
    });
  }
}

export default async function dispatcher(req: VercelRequest, res: VercelResponse) {
  try {
    const action = getAction(req);

    if (action === "test-org-credentials") {
      return await handleTestOrgCredentials(req, res);
    }

    const entry = ROUTES[action];
    if (!entry) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(404).json({ ok: false, error: `Unknown razorpay action: ${action}` });
    }

    if (entry.kind === "node") {
      return await entry.handler(req, res);
    }
    return await callEdgeHandler(entry.handler, req, res);
  } catch (err) {
    console.error("[razorpay dispatcher] unhandled error:", err);
    try {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // response already committed
    }
  }
}
