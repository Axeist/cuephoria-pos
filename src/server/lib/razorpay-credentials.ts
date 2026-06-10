/**
 * Shared Razorpay key resolution — platform env vars + per-org stored credentials.
 *
 * Platform (env):
 *   Main (default): RAZORPAY_KEY_ID_LIVE / RAZORPAY_KEY_SECRET_LIVE (or TEST variants)
 *   Lite branch: RAZORPAY_KEY_ID_LIVE_LITE / RAZORPAY_KEY_SECRET_LIVE_LITE
 *
 * Tenant booking checkout prefers org credentials from payment_gateway_configs.settings.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "./payment-secrets.js";
import type { PaymentMode } from "./payment-provider.js";
import { supabaseServiceClient } from "../supabaseServer.js";

export type RazorpayProfile = "default" | "lite";
export type RazorpayPurpose = "booking" | "platform";
export type RazorpayCredentialSource = "org" | "env";

export type ResolvedRazorpayCredentials = {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  isLive: boolean;
  profile: RazorpayProfile;
  mode: PaymentMode;
  source: RazorpayCredentialSource;
  organizationId: string | null;
};

type ModeCredentials = {
  key_id?: string;
  key_secret_enc?: string;
  webhook_secret_enc?: string;
};

type GatewaySettings = {
  credentials?: Partial<Record<PaymentMode, ModeCredentials>>;
};

function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, string | undefined>)[name];
  }
  const fromDeno = (globalThis as { Deno?: { env?: { get?: (n: string) => string | undefined } } })
    .Deno?.env?.get?.(name);
  return fromDeno;
}

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function parseRazorpayProfile(raw: string | null | undefined): RazorpayProfile {
  const p = (raw || "").trim().toLowerCase();
  return p === "lite" ? "lite" : "default";
}

export function getPlatformWebhookSecret(mode?: PaymentMode): string {
  const resolvedMode = mode ?? ((getEnv("RAZORPAY_MODE") || "test") === "live" ? "live" : "test");
  if (resolvedMode === "live") {
    return need("RAZORPAY_WEBHOOK_SECRET_LIVE") || need("RAZORPAY_WEBHOOK_SECRET");
  }
  return need("RAZORPAY_WEBHOOK_SECRET_TEST") || need("RAZORPAY_WEBHOOK_SECRET");
}

/** Legacy sync env-only resolver (platform billing, env fallback). */
export function getRazorpayCredentials(profile: RazorpayProfile = "default") {
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";

  if (profile === "lite") {
    if (isLive) {
      const keyId = getEnv("RAZORPAY_KEY_ID_LIVE_LITE") || need("RAZORPAY_KEY_ID_LIVE_LITE");
      const keySecret = getEnv("RAZORPAY_KEY_SECRET_LIVE_LITE") || need("RAZORPAY_KEY_SECRET_LIVE_LITE");
      return { keyId, keySecret, isLive, profile, mode: isLive ? ("live" as const) : ("test" as const) };
    }
    const keyId =
      getEnv("RAZORPAY_KEY_ID_TEST_LITE") ||
      getEnv("RAZORPAY_KEY_ID_TEST") ||
      getEnv("RAZORPAY_KEY_ID") ||
      need("RAZORPAY_KEY_ID_TEST");
    const keySecret =
      getEnv("RAZORPAY_KEY_SECRET_TEST_LITE") ||
      getEnv("RAZORPAY_KEY_SECRET_TEST") ||
      getEnv("RAZORPAY_KEY_SECRET") ||
      need("RAZORPAY_KEY_SECRET_TEST");
    return { keyId, keySecret, isLive, profile, mode: isLive ? ("live" as const) : ("test" as const) };
  }

  const keyId = isLive
    ? getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_LIVE")
    : getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_TEST");

  const keySecret = isLive
    ? getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_LIVE")
    : getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_TEST");

  return { keyId, keySecret, isLive, profile, mode: isLive ? ("live" as const) : ("test" as const) };
}

export function getRazorpayKeyId(profile: RazorpayProfile = "default"): string {
  return getRazorpayCredentials(profile).keyId;
}

async function lookupOrganizationId(
  supabase: SupabaseClient,
  args: { organizationId?: string; locationId?: string; orderId?: string },
): Promise<string | null> {
  if (args.organizationId) return args.organizationId;

  if (args.locationId) {
    const { data } = await supabase
      .from("locations")
      .select("organization_id")
      .eq("id", args.locationId)
      .maybeSingle();
    return (data as { organization_id?: string } | null)?.organization_id ?? null;
  }

  if (args.orderId) {
    const { data } = await supabase
      .from("payment_orders")
      .select("organization_id, location_id")
      .eq("provider", "razorpay")
      .eq("provider_order_id", args.orderId)
      .maybeSingle();
    const row = data as { organization_id?: string | null; location_id?: string | null } | null;
    if (row?.organization_id) return row.organization_id;
    if (row?.location_id) {
      return lookupOrganizationId(supabase, { locationId: row.location_id });
    }
  }

  return null;
}

async function resolveOrgCredentials(
  organizationId: string,
  modeOverride?: PaymentMode,
): Promise<ResolvedRazorpayCredentials | null> {
  const supabase = supabaseServiceClient("cuetronix-razorpay-org-creds");
  const { data, error } = await supabase
    .from("payment_gateway_configs")
    .select("mode, is_enabled, settings")
    .eq("organization_id", organizationId)
    .eq("provider", "razorpay")
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { mode: PaymentMode; is_enabled: boolean; settings: GatewaySettings };
  if (!row.is_enabled) return null;

  const activeMode = modeOverride ?? row.mode;
  const creds = row.settings?.credentials?.[activeMode];
  if (!creds?.key_id || !creds.key_secret_enc) return null;

  try {
    const keySecret = await decryptSecret(creds.key_secret_enc);
    let webhookSecret: string | null = null;
    if (creds.webhook_secret_enc) {
      webhookSecret = await decryptSecret(creds.webhook_secret_enc);
    }
    return {
      keyId: creds.key_id.trim(),
      keySecret,
      webhookSecret,
      isLive: activeMode === "live",
      profile: "default",
      mode: activeMode,
      source: "org",
      organizationId,
    };
  } catch (err) {
    console.error("[razorpay-credentials] org credential decrypt failed:", (err as Error).message);
    return null;
  }
}

export async function resolveRazorpayCredentials(input: {
  organizationId?: string;
  locationId?: string;
  orderId?: string;
  mode?: PaymentMode;
  profile?: RazorpayProfile;
  purpose?: RazorpayPurpose;
  supabase?: SupabaseClient;
}): Promise<ResolvedRazorpayCredentials> {
  const profile = input.profile ?? "default";
  const purpose = input.purpose ?? "booking";

  if (purpose === "platform") {
    const env = getRazorpayCredentials(profile);
    return {
      keyId: env.keyId,
      keySecret: env.keySecret,
      webhookSecret: null,
      isLive: env.isLive,
      profile,
      mode: env.mode,
      source: "env",
      organizationId: null,
    };
  }

  const supabase = input.supabase ?? supabaseServiceClient("cuetronix-razorpay-resolve");
  const organizationId = await lookupOrganizationId(supabase, {
    organizationId: input.organizationId,
    locationId: input.locationId,
    orderId: input.orderId,
  });

  if (organizationId) {
    const orgCreds = await resolveOrgCredentials(organizationId, input.mode);
    if (orgCreds) return orgCreds;
  }

  const env = getRazorpayCredentials(profile);
  return {
    keyId: env.keyId,
    keySecret: env.keySecret,
    webhookSecret: null,
    isLive: env.isLive,
    profile,
    mode: env.mode,
    source: "env",
    organizationId,
  };
}

/** Read plaintext key_id for Edge get-key-id (no decrypt needed). */
export async function resolveRazorpayKeyIdOnly(input: {
  locationId?: string;
  profile?: RazorpayProfile;
}): Promise<string> {
  const profile = input.profile ?? "default";
  if (input.locationId) {
    const supabase = supabaseServiceClient("cuetronix-razorpay-key-id");
    const orgId = await lookupOrganizationId(supabase, { locationId: input.locationId });
    if (orgId) {
      const { data } = await supabase
        .from("payment_gateway_configs")
        .select("mode, is_enabled, settings")
        .eq("organization_id", orgId)
        .eq("provider", "razorpay")
        .maybeSingle();
      const row = data as { mode: PaymentMode; is_enabled: boolean; settings: GatewaySettings } | null;
      if (row?.is_enabled) {
        const keyId = row.settings?.credentials?.[row.mode]?.key_id;
        if (keyId) return keyId.trim();
      }
    }
  }
  return getRazorpayKeyId(profile);
}

/** Webhook verification: org secret first, then platform secrets. */
export async function resolveWebhookSecretsForOrder(orderId: string | null): Promise<string[]> {
  const secrets: string[] = [];
  const seen = new Set<string>();

  const add = (s: string | null | undefined) => {
    const v = String(s || "").trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    secrets.push(v);
  };

  if (orderId) {
    try {
      const orgCreds = await resolveRazorpayCredentials({ orderId, purpose: "booking" });
      if (orgCreds.webhookSecret) add(orgCreds.webhookSecret);
    } catch {
      // continue to platform fallbacks
    }
  }

  try {
    add(getPlatformWebhookSecret("test"));
    add(getPlatformWebhookSecret("live"));
  } catch {
    // platform secrets may be partially configured
  }

  return secrets;
}

export async function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  creds: ResolvedRazorpayCredentials,
): Promise<boolean> {
  if (!orderId || !paymentId || !signature) return false;
  try {
    const payload = `${orderId}|${paymentId}`;
    const encoder = new TextEncoder();

    if (typeof process !== "undefined" && process.versions?.node) {
      const { createHmac, timingSafeEqual } = await import("crypto");
      const expected = createHmac("sha256", creds.keySecret).update(payload).digest("hex");
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(signature.trim(), "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    }

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(creds.keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return expected === signature.trim();
  } catch (err) {
    console.error("[razorpay-credentials] signature verify failed:", err);
    return false;
  }
}
