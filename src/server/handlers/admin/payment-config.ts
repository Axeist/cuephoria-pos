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

export const config = { runtime: "edge" };

async function verifyOrgRazorpayCredentials(
  organizationId: string,
  mode: PaymentMode,
): Promise<{ ok: boolean; message: string }> {
  try {
    const creds = await resolveRazorpayCredentials({
      organizationId,
      mode,
      purpose: "booking",
    });
    if (creds.source !== "org") {
      return {
        ok: false,
        message: "No saved workspace credentials found. Paste your API keys in Step 3 first.",
      };
    }
    const auth = btoa(`${creds.keyId}:${creds.keySecret}`);
    const response = await fetch("https://api.razorpay.com/v1/orders?count=1", {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "content-type": "application/json",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      let message = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { error?: { description?: string; code?: string } };
        message = parsed?.error?.description || parsed?.error?.code || message;
      } catch {
        // keep raw text fallback
      }
      return {
        ok: false,
        message: `Razorpay auth failed (${response.status}, ${mode}): ${message}`,
      };
    }
    await markCredentialTestPassed(organizationId, "razorpay");
    return { ok: true, message: `Razorpay credentials are valid in ${mode} mode.` };
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
  const keyId = typeof c.key_id === "string" ? c.key_id.trim() : undefined;
  const keySecret = typeof c.key_secret === "string" ? c.key_secret : undefined;
  const webhookSecret = typeof c.webhook_secret === "string" ? c.webhook_secret : undefined;
  if (keyId && !validateRazorpayKeyIdPrefix(keyId, mode)) {
    throw new Error(
      mode === "live"
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
      const result = await verifyOrgRazorpayCredentials(ctx.organizationId, mode);
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
