import { getEnv } from "../adminApiUtils";
import { supabaseServiceClient } from "../supabaseServer";
import { encryptSecret, isPaymentSecretsEncryptionConfigured } from "./payment-secrets";
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

export type PaymentSetupSteps = {
  keys: boolean;
  webhook: boolean;
  tested: boolean;
  enabled: boolean;
  all_complete: boolean;
};

export type PaymentGatewayConfigView = PaymentGatewayConfigRow & {
  public_key_masked: string | null;
  has_secret: boolean;
  has_webhook_secret: boolean;
  provider_ready: boolean;
  platform_fallback_available: boolean;
  setup_steps: PaymentSetupSteps;
  credentials_configured: boolean;
};

type ModeCredentials = {
  key_id?: string;
  key_secret_enc?: string;
  webhook_secret_enc?: string;
};

type GatewaySettings = {
  credentials?: Partial<Record<PaymentMode, ModeCredentials>>;
  last_credential_test_at?: string;
  last_webhook_event?: string;
};

export function maskKeyId(keyId: string | null | undefined): string | null {
  const v = String(keyId || "").trim();
  if (!v) return null;
  if (v.length <= 8) return `${v.slice(0, 2)}***`;
  return `${v.slice(0, 8)}***${v.slice(-4)}`;
}

function resolveEnvPresence(provider: PaymentProvider, mode: PaymentMode) {
  if (provider === "stripe") {
    const key = mode === "live" ? getEnv("STRIPE_PUBLISHABLE_KEY_LIVE") : getEnv("STRIPE_PUBLISHABLE_KEY_TEST");
    const secret = mode === "live" ? getEnv("STRIPE_SECRET_KEY_LIVE") : getEnv("STRIPE_SECRET_KEY_TEST");
    return { keyId: key || null, hasSecret: !!secret };
  }
  const keyId = mode === "live" ? getEnv("RAZORPAY_KEY_ID_LIVE") : getEnv("RAZORPAY_KEY_ID_TEST");
  const keySecret = mode === "live" ? getEnv("RAZORPAY_KEY_SECRET_LIVE") : getEnv("RAZORPAY_KEY_SECRET_TEST");
  return { keyId: keyId || null, hasSecret: !!keySecret };
}

function getModeCredentials(settings: GatewaySettings, mode: PaymentMode): ModeCredentials | null {
  return settings.credentials?.[mode] ?? null;
}

function buildSetupSteps(row: PaymentGatewayConfigRow, creds: ModeCredentials | null): PaymentSetupSteps {
  const hasKeys = !!(creds?.key_id && creds.key_secret_enc);
  const hasWebhook = !!creds?.webhook_secret_enc;
  const tested = !!row.settings?.last_credential_test_at;
  const enabled = row.is_enabled;
  return {
    keys: hasKeys,
    webhook: hasWebhook,
    tested,
    enabled,
    all_complete: hasKeys && hasWebhook && tested && enabled,
  };
}

function buildConfigView(row: PaymentGatewayConfigRow): PaymentGatewayConfigView {
  const settings = (row.settings ?? {}) as GatewaySettings;
  const creds = getModeCredentials(settings, parsePaymentMode(row.mode));
  const env = resolveEnvPresence(parsePaymentProvider(row.provider), parsePaymentMode(row.mode));

  const orgKeyId = creds?.key_id ?? null;
  const orgHasSecret = !!creds?.key_secret_enc;
  const orgHasWebhook = !!creds?.webhook_secret_enc;
  const credentialsConfigured = !!(orgKeyId && orgHasSecret);

  const providerReady =
    row.is_enabled &&
    ((credentialsConfigured && isPaymentSecretsEncryptionConfigured()) ||
      (!!env.keyId && env.hasSecret && !credentialsConfigured));

  return {
    ...row,
    public_key_masked: maskKeyId(orgKeyId || env.keyId),
    has_secret: orgHasSecret || env.hasSecret,
    has_webhook_secret: orgHasWebhook,
    provider_ready: providerReady,
    platform_fallback_available: !!env.keyId && env.hasSecret,
    credentials_configured: credentialsConfigured,
    setup_steps: buildSetupSteps(row, creds),
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
  return rows.map(buildConfigView);
}

export async function getPaymentGatewayConfig(
  organizationId: string,
  provider: PaymentProvider,
): Promise<PaymentGatewayConfigView | null> {
  const supabase = supabaseServiceClient("cuetronix-payment-config-get-one");
  const { data, error } = await supabase
    .from("payment_gateway_configs")
    .select(
      "id, organization_id, provider, mode, is_enabled, supported_currencies, is_international_enabled, webhook_configured, webhook_last_event_at, settings, updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return buildConfigView(data as PaymentGatewayConfigRow);
}

export type CredentialInput = {
  key_id?: string;
  key_secret?: string;
  webhook_secret?: string;
};

export async function mergeGatewayCredentials(
  existingSettings: GatewaySettings,
  mode: PaymentMode,
  input: CredentialInput,
): Promise<GatewaySettings> {
  if (!isPaymentSecretsEncryptionConfigured()) {
    throw new Error(
      "PAYMENT_SECRETS_ENCRYPTION_KEY is not configured. Contact support to enable payment credential storage.",
    );
  }

  const prev = existingSettings.credentials?.[mode] ?? {};
  const next: ModeCredentials = { ...prev };

  if (input.key_id !== undefined) {
    next.key_id = input.key_id.trim();
  }
  if (input.key_secret !== undefined && input.key_secret.trim().length > 0) {
    next.key_secret_enc = await encryptSecret(input.key_secret.trim());
  }
  if (input.webhook_secret !== undefined && input.webhook_secret.trim().length > 0) {
    next.webhook_secret_enc = await encryptSecret(input.webhook_secret.trim());
  }

  return {
    ...existingSettings,
    credentials: {
      ...existingSettings.credentials,
      [mode]: next,
    },
  };
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
  credentials?: CredentialInput;
}) {
  const supabase = supabaseServiceClient("cuetronix-payment-config-upsert");

  let settings = (input.settings ?? {}) as GatewaySettings;
  const mode = input.mode ?? "test";

  if (input.credentials) {
    const { data: existing } = await supabase
      .from("payment_gateway_configs")
      .select("settings")
      .eq("organization_id", input.organizationId)
      .eq("provider", input.provider)
      .maybeSingle();
    const prevSettings = ((existing as { settings?: GatewaySettings } | null)?.settings ??
      {}) as GatewaySettings;
    settings = await mergeGatewayCredentials(prevSettings, mode, input.credentials);
    if (input.settings) {
      settings = { ...settings, ...input.settings };
    }
  }

  const payload = {
    organization_id: input.organizationId,
    provider: input.provider,
    mode,
    is_enabled: input.isEnabled ?? false,
    supported_currencies: input.supportedCurrencies ?? ["INR"],
    is_international_enabled: input.isInternationalEnabled ?? false,
    webhook_configured: input.webhookConfigured ?? false,
    settings,
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
  return buildConfigView(data as PaymentGatewayConfigRow);
}

export async function markCredentialTestPassed(organizationId: string, provider: PaymentProvider) {
  const supabase = supabaseServiceClient("cuetronix-payment-config-test-mark");
  const { data: existing } = await supabase
    .from("payment_gateway_configs")
    .select("settings")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();
  const settings = {
    ...(((existing as { settings?: GatewaySettings } | null)?.settings ?? {}) as GatewaySettings),
    last_credential_test_at: new Date().toISOString(),
  };
  await supabase
    .from("payment_gateway_configs")
    .update({ settings })
    .eq("organization_id", organizationId)
    .eq("provider", provider);
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

export async function lookupPaymentOrderOrganizationId(orderId: string): Promise<string | null> {
  const supabase = supabaseServiceClient("cuetronix-payment-order-org-lookup");
  const { data } = await supabase
    .from("payment_orders")
    .select("organization_id, location_id")
    .eq("provider", "razorpay")
    .eq("provider_order_id", orderId)
    .maybeSingle();
  const row = data as { organization_id?: string | null; location_id?: string | null } | null;
  if (row?.organization_id) return row.organization_id;
  if (row?.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("organization_id")
      .eq("id", row.location_id)
      .maybeSingle();
    return (loc as { organization_id?: string } | null)?.organization_id ?? null;
  }
  return null;
}
