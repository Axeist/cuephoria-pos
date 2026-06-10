/**
 * POST /api/razorpay/test-org-credentials
 * Node-only — verifies tenant Razorpay keys using the official SDK (not Edge fetch).
 */

import {
  findStoredCredentialSlot,
  getPaymentGatewayConfig,
  markCredentialTestPassed,
} from "../../lib/payment-gateway-config.js";
import { isPaymentSecretsEncryptionConfigured } from "../../lib/payment-secrets.js";
import { inferPaymentModeFromKeyId, parsePaymentMode } from "../../lib/payment-provider.js";
import { resolveRazorpayCredentials } from "../../lib/razorpay-credentials.js";
import { normalizePaymentCredential } from "../../lib/razorpay-auth.js";
import { testRazorpayCredentialsNode } from "../../lib/razorpay-auth-node.js";
import { resolveOrgContext } from "../../orgContext.js";
import { toFetchRequest, type VercelRequest, type VercelResponse } from "../../lib/node-dispatcher.js";

export const config = { maxDuration: 30 };

function j(res: VercelResponse, data: unknown, status = 200) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function parseInlineCredentials(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const c = (body as { credentials?: Record<string, unknown> }).credentials;
  if (!c || typeof c !== "object") return undefined;
  const keyId = typeof c.key_id === "string" ? normalizePaymentCredential(c.key_id) : undefined;
  const keySecret = typeof c.key_secret === "string" ? normalizePaymentCredential(c.key_secret) : undefined;
  if (!keyId && !keySecret) return undefined;
  return { key_id: keyId, key_secret: keySecret };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return j(res, {}, 200);
  if (req.method !== "POST") return j(res, { ok: false, error: "Method not allowed" }, 405);

  try {
    const fetchReq = toFetchRequest(req);
    const orgResult = await resolveOrgContext(fetchReq);
    if ("code" in orgResult) {
      return j(res, { ok: false, error: orgResult.message, code: orgResult.code }, orgResult.status);
    }
    if (!orgResult.user.isAdmin) {
      return j(res, { ok: false, error: "Only admins can test payment gateways." }, 403);
    }

    if (!isPaymentSecretsEncryptionConfigured()) {
      return j(
        res,
        {
          ok: true,
          result: {
            ok: false,
            message:
              "Payment encryption is not configured on the server (PAYMENT_SECRETS_ENCRYPTION_KEY). Contact support.",
          },
        },
        200,
      );
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const mode = parsePaymentMode(body.mode);
    const inline = parseInlineCredentials(body);

    if (inline?.key_id && inline.key_secret) {
      const effectiveMode = inferPaymentModeFromKeyId(inline.key_id) ?? mode;
      const result = await testRazorpayCredentialsNode({
        keyId: inline.key_id,
        keySecret: inline.key_secret,
        mode: effectiveMode,
      });
      if (result.ok) {
        await markCredentialTestPassed(orgResult.organizationId, "razorpay");
      }
      return j(res, { ok: true, provider: "razorpay", result }, 200);
    }

    if (inline?.key_id && !inline.key_secret) {
      return j(
        res,
        {
          ok: true,
          result: {
            ok: false,
            message:
              "Key Secret is required. Paste the secret from Razorpay Dashboard (shown only once when generated).",
          },
        },
        200,
      );
    }

    const configRow = await getPaymentGatewayConfig(orgResult.organizationId, "razorpay");
    const stored = findStoredCredentialSlot(
      (configRow?.settings ?? {}) as import("../../lib/payment-gateway-config.js").GatewaySettings,
      mode,
    );
    if (!stored) {
      return j(
        res,
        {
          ok: true,
          result: { ok: false, message: "No saved credentials found. Paste Key ID and Secret first." },
        },
        200,
      );
    }

    const effectiveMode = inferPaymentModeFromKeyId(stored.creds.key_id ?? "") ?? stored.mode;
    const creds = await resolveRazorpayCredentials({
      organizationId: orgResult.organizationId,
      mode: effectiveMode,
      purpose: "booking",
      requireEnabled: false,
    });
    if (creds.source !== "org") {
      return j(
        res,
        {
          ok: true,
          result: {
            ok: false,
            message: "Could not read saved credentials. Re-enter your API keys and save again.",
          },
        },
        200,
      );
    }

    const result = await testRazorpayCredentialsNode({
      keyId: creds.keyId,
      keySecret: creds.keySecret,
      mode: effectiveMode,
    });
    if (result.ok) {
      await markCredentialTestPassed(orgResult.organizationId, "razorpay");
    }
    return j(res, { ok: true, provider: "razorpay", result }, 200);
  } catch (err) {
    console.error("[test-org-credentials]", err);
    return j(res, { ok: false, error: err instanceof Error ? err.message : "Test failed" }, 500);
  }
}
