import { j } from "../../adminApiUtils";
import { withOrgContext } from "../../orgContext";
import {
  listPaymentGatewayConfigs,
  markCredentialTestPassed,
  upsertPaymentGatewayConfig,
} from "../../lib/payment-gateway-config";
import {
  parseCurrency,
  parsePaymentMode,
  parsePaymentProvider,
  type PaymentProvider,
  type PaymentMode,
} from "../../lib/payment-provider";
import { resolveRazorpayCredentials } from "../../lib/razorpay-credentials";
import { validateRazorpayKeyIdPrefix } from "../../lib/payment-checkout-guards";
import { getPaymentGatewayConfig } from "../../lib/payment-gateway-config";
import { isPaymentSecretsEncryptionConfigured } from "../../lib/payment-secrets";
import { testRazorpayCredentials, normalizePaymentCredential } from "../../lib/razorpay-auth";
import { findStoredCredentialSlot } from "../../lib/payment-gateway-config";
import { inferPaymentModeFromKeyId } from "../../lib/payment-provider";

export const config = { runtime: "edge" };

async function verifyOrgRazorpayCredentials(
  organizationId: string,
  mode: PaymentMode,
  inline?: { key_id?: string; key_secret?: string },
): Promise<{ ok: boolean; message: string }> {
  try {
    if (!isPaymentSecretsEncryptionConfigured()) {
      return {
        ok: false,
        message:
          "Payment encryption is not configured on the server (PAYMENT_SECRETS_ENCRYPTION_KEY). Contact support.",
      };
    }

    const inlineKeyId = inline?.key_id ? normalizePaymentCredential(inline.key_id) : undefined;
    const inlineSecret = inline?.key_secret ? normalizePaymentCredential(inline.key_secret) : undefined;

    if (inlineKeyId && inlineSecret) {
      const effectiveMode = inferPaymentModeFromKeyId(inlineKeyId) ?? mode;
      if (!validateRazorpayKeyIdPrefix(inlineKeyId, effectiveMode)) {
        return {
          ok: false,
          message:
            effectiveMode === "live"
              ? "Live mode requires a Key ID starting with rzp_live_"
              : "Test mode requires a Key ID starting with rzp_test_",
        };
      }
      const result = await testRazorpayCredentials({
        keyId: inlineKeyId,
        keySecret: inlineSecret,
        mode: effectiveMode,
      });
      if (result.ok) {
        await markCredentialTestPassed(organizationId, "razorpay");
      }
      return result;
    }

    if (inlineKeyId && !inlineSecret) {
      return {
        ok: false,
        message:
          "Key Secret is required to test these keys. Re-paste the secret from Razorpay Dashboard (it is only shown once when generated).",
      };
    }

    const configRow = await getPaymentGatewayConfig(organizationId, "razorpay");
    const settings = (configRow?.settings ?? {}) as {
      credentials?: Partial<Record<PaymentMode, { key_id?: string; key_secret_enc?: string }>>;
    };
    const stored = findStoredCredentialSlot(settings, mode);

    if (!stored) {
      return {
        ok: false,
        message: "No saved workspace credentials found. Paste your API keys in Step 3 first.",
      };
    }

    const effectiveMode = inferPaymentModeFromKeyId(stored.creds.key_id ?? "") ?? stored.mode;
    const creds = await resolveRazorpayCredentials({
      organizationId,
      mode: effectiveMode,
      purpose: "booking",
      requireEnabled: false,
    });
    if (creds.source !== "org") {
      return {
        ok: false,
        message:
          "Could not read saved credentials. Re-enter your API keys in Step 3 and save again.",
      };
    }

    const result = await testRazorpayCredentials({
      keyId: creds.keyId,
      keySecret: creds.keySecret,
      mode: effectiveMode,
    });
    if (result.ok) {
      await markCredentialTestPassed(organizationId, "razorpay");
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Credential test failed",
    };
  }
}

function parseSupportedCurrencies(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ["INR"];
  const clean = raw
    .map((v) => parseCurrency(v, ""))
    .filter((v) => !!v);
  return clean.length > 0 ? Array.from(new Set(clean)) : ["INR"];
}

function parseCredentials(raw: unknown, mode: PaymentMode) {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  const keyId = typeof c.key_id === "string" ? normalizePaymentCredential(c.key_id) : undefined;
  const keySecret = typeof c.key_secret === "string" ? normalizePaymentCredential(c.key_secret) : undefined;
  const webhookSecret =
    typeof c.webhook_secret === "string" ? normalizePaymentCredential(c.webhook_secret) : undefined;
  if (keyId && !validateRazorpayKeyIdPrefix(keyId, inferPaymentModeFromKeyId(keyId) ?? mode)) {
    throw new Error(
      inferPaymentModeFromKeyId(keyId) === "live"
        ? "Live mode requires a key ID starting with rzp_live_"
        : "Test mode requires a key ID starting with rzp_test_",
    );
  }
  if (!keyId && !keySecret && !webhookSecret) return undefined;
  return { key_id: keyId, key_secret: keySecret, webhook_secret: webhookSecret };
}

export default withOrgContext(async (req, ctx) => {
  if (!ctx.user.isAdmin) {
    return j({ ok: false, error: "Only admins can manage payment gateways." }, 403);
  }

  if (req.method === "GET") {
    const configs = await listPaymentGatewayConfigs(ctx.organizationId);
    return j({ ok: true, configs }, 200);
  }

  if (req.method === "PUT") {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const provider = parsePaymentProvider(body.provider);
    const mode = parsePaymentMode(body.mode);
    let credentials;
    try {
      credentials = parseCredentials(body.credentials, mode);
    } catch (err) {
      return j({ ok: false, error: (err as Error).message }, 400);
    }

    const row = await upsertPaymentGatewayConfig({
      organizationId: ctx.organizationId,
      adminUserId: ctx.user.id,
      provider,
      mode,
      isEnabled: Boolean(body.is_enabled),
      supportedCurrencies: parseSupportedCurrencies(body.supported_currencies),
      isInternationalEnabled: Boolean(body.is_international_enabled),
      webhookConfigured: Boolean(body.webhook_configured),
      settings:
        body.settings && typeof body.settings === "object"
          ? (body.settings as Record<string, unknown>)
          : {},
      credentials,
    });
    return j({ ok: true, config: row }, 200);
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action || "").trim().toLowerCase();
    const provider = parsePaymentProvider(body.provider);
    const mode = parsePaymentMode(body.mode);

    if (action === "test-credentials") {
      if (provider !== "razorpay") {
        return j(
          {
            ok: true,
            provider,
            result: {
              ok: false,
              message: "Stripe test is not wired yet. Add STRIPE_* env vars and provider implementation later.",
            },
          },
          200,
        );
      }
      const result = await verifyOrgRazorpayCredentials(
        ctx.organizationId,
        mode,
        parseCredentials(body.credentials, mode),
      );
      return j({ ok: true, provider, result }, 200);
    }

    if (action === "webhook-health") {
      const configs = await listPaymentGatewayConfigs(ctx.organizationId);
      const match = configs.find((c) => c.provider === (provider as PaymentProvider));
      return j(
        {
          ok: true,
          provider,
          webhook: {
            configured: !!match?.webhook_configured,
            last_event_at: match?.webhook_last_event_at ?? null,
            last_event: (match?.settings?.last_webhook_event as string | undefined) ?? null,
          },
        },
        200,
      );
    }

    return j({ ok: false, error: `Unknown action: ${action}` }, 400);
  }

  return j({ ok: false, error: "Method not allowed" }, 405);
});
