import { getEnv } from "../adminApiUtils";
import { supabaseServiceClient } from "../supabaseServer";
import { parsePaymentMode, parsePaymentProvider, type PaymentMode, type PaymentProvider } from "./payment-provider";

export type PaymentGatewayConfigRow = {
  id: string;
  organization_id: string;
  provider: PaymentProvider;
  mode: PaymentMode;
  is_enabled: boolean;
  supported_currencies: string[];
  is_international_enabled: boolean;
  webhook_configured: boolean;
  webhook_last_event_at: string | null;
  settings: Record<string, unknown>;
  updated_at: string;
};

export type PaymentGatewayConfigView = PaymentGatewayConfigRow & {
  public_key_masked: string | null;
  has_secret: boolean;
  provider_ready: boolean;
};

function maskKeyId(keyId: string | null | undefined): string | null {
  const v = String(keyId || "").trim();
  if (!v) return null;
  if (v.length <= 8) return `${v.slice(0, 2)}***`;
  return `${v.slice(0, 8)}***${v.slice(-4)}`;
}

function resolveEnvPresence(provider: PaymentProvider, mode: PaymentMode) {
  if (provider === "stripe") {
    const key = mode === "live" ? getEnv("STRIPE_PUBLISHABLE_KEY_LIVE") : getEnv("STRIPE_PUBLISHABLE_KEY_TEST");
    const secret = mode === "live" ? getEnv("STRIPE_SECRET_KEY_LIVE") : getEnv("STRIPE_SECRET_KEY_TEST");
    return {
      keyId: key || null,
      hasSecret: !!secret,
    };
  }
  const keyId = mode === "live" ? getEnv("RAZORPAY_KEY_ID_LIVE") : getEnv("RAZORPAY_KEY_ID_TEST");
  const keySecret = mode === "live" ? getEnv("RAZORPAY_KEY_SECRET_LIVE") : getEnv("RAZORPAY_KEY_SECRET_TEST");
  return {
    keyId: keyId || null,
    hasSecret: !!keySecret,
  };
}

export async function listPaymentGatewayConfigs(organizationId: string): Promise<PaymentGatewayConfigView[]> {
  const supabase = supabaseServiceClient("cuetronix-payment-config-get");
  const { data, error } = await supabase
    .from("payment_gateway_configs")
    .select(
      "id, organization_id, provider, mode, is_enabled, supported_currencies, is_international_enabled, webhook_configured, webhook_last_event_at, settings, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("provider", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PaymentGatewayConfigRow[];
  return rows.map((row) => {
    const env = resolveEnvPresence(parsePaymentProvider(row.provider), parsePaymentMode(row.mode));
    return {
      ...row,
      public_key_masked: maskKeyId(env.keyId),
      has_secret: env.hasSecret,
      provider_ready: !!env.keyId && env.hasSecret && row.is_enabled,
    };
  });
}

export async function upsertPaymentGatewayConfig(input: {
  organizationId: string;
  adminUserId: string;
  provider: PaymentProvider;
  mode?: PaymentMode;
  isEnabled?: boolean;
  supportedCurrencies?: string[];
  isInternationalEnabled?: boolean;
  webhookConfigured?: boolean;
  settings?: Record<string, unknown>;
}) {
  const supabase = supabaseServiceClient("cuetronix-payment-config-upsert");
  const payload = {
    organization_id: input.organizationId,
    provider: input.provider,
    mode: input.mode ?? "test",
    is_enabled: input.isEnabled ?? false,
    supported_currencies: input.supportedCurrencies ?? ["INR"],
    is_international_enabled: input.isInternationalEnabled ?? false,
    webhook_configured: input.webhookConfigured ?? false,
    settings: input.settings ?? {},
    updated_by: input.adminUserId,
  };

  const { data, error } = await supabase
    .from("payment_gateway_configs")
    .upsert(payload, { onConflict: "organization_id,provider" })
    .select(
      "id, organization_id, provider, mode, is_enabled, supported_currencies, is_international_enabled, webhook_configured, webhook_last_event_at, settings, updated_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return data as PaymentGatewayConfigRow;
}

export async function recordWebhookEventHeartbeat(args: {
  provider: PaymentProvider;
  organizationId: string | null;
  event: string;
}) {
  if (!args.organizationId) return;
  const supabase = supabaseServiceClient("cuetronix-payment-config-webhook-heartbeat");
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("payment_gateway_configs")
    .select("id, settings")
    .eq("organization_id", args.organizationId)
    .eq("provider", args.provider)
    .maybeSingle();

  const previousSettings = (existing?.settings ?? {}) as Record<string, unknown>;
  const settings = {
    ...previousSettings,
    last_webhook_event: args.event,
  };

  await supabase
    .from("payment_gateway_configs")
    .upsert(
      {
        organization_id: args.organizationId,
        provider: args.provider,
        webhook_configured: true,
        webhook_last_event_at: now,
        settings,
      },
      { onConflict: "organization_id,provider" },
    );
}
