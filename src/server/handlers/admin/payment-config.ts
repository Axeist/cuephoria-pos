import { j } from "../../adminApiUtils";
import { withOrgContext } from "../../orgContext";
import {
  listPaymentGatewayConfigs,
  upsertPaymentGatewayConfig,
} from "../../lib/payment-gateway-config";
import {
  parseCurrency,
  parsePaymentMode,
  parsePaymentProvider,
  type PaymentProvider,
  type PaymentMode,
} from "../../lib/payment-provider";
import { getRazorpayCredentials } from "../../lib/razorpay-credentials";
import { getEnv } from "../../adminApiUtils";

export const config = { runtime: "edge" };

function getRazorpayCredentialsByMode(mode: PaymentMode): { keyId: string; keySecret: string } {
  const keyId =
    (mode === "live" ? getEnv("RAZORPAY_KEY_ID_LIVE") : getEnv("RAZORPAY_KEY_ID_TEST")) ||
    getEnv("RAZORPAY_KEY_ID");
  const keySecret =
    (mode === "live" ? getEnv("RAZORPAY_KEY_SECRET_LIVE") : getEnv("RAZORPAY_KEY_SECRET_TEST")) ||
    getEnv("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    throw new Error(
      mode === "live"
        ? "Missing RAZORPAY_KEY_ID_LIVE / RAZORPAY_KEY_SECRET_LIVE"
        : "Missing RAZORPAY_KEY_ID_TEST / RAZORPAY_KEY_SECRET_TEST",
    );
  }
  return {
    keyId: keyId.trim(),
    keySecret: keySecret.trim(),
  };
}

async function verifyRazorpayCredentials(mode?: PaymentMode): Promise<{ ok: boolean; message: string }> {
  try {
    const resolvedMode = mode ?? (getRazorpayCredentials("default").isLive ? "live" : "test");
    const { keyId, keySecret } = getRazorpayCredentialsByMode(resolvedMode);
    const auth = btoa(`${keyId}:${keySecret}`);
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
        message: `Razorpay auth failed (${response.status}, ${resolvedMode}): ${message}`,
      };
    }
    return { ok: true, message: `Razorpay credentials are valid in ${resolvedMode} mode.` };
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
    const row = await upsertPaymentGatewayConfig({
      organizationId: ctx.organizationId,
      adminUserId: ctx.user.id,
      provider,
      mode: parsePaymentMode(body.mode),
      isEnabled: Boolean(body.is_enabled),
      supportedCurrencies: parseSupportedCurrencies(body.supported_currencies),
      isInternationalEnabled: Boolean(body.is_international_enabled),
      webhookConfigured: Boolean(body.webhook_configured),
      settings:
        body.settings && typeof body.settings === "object"
          ? (body.settings as Record<string, unknown>)
          : {},
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
      const result = await verifyRazorpayCredentials(mode);
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
