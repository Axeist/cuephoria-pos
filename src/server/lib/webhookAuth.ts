import { getWebhookSecret, isWebhookAuthDisabled } from "./securityFlags";

type HeaderSource = {
  headers?: Record<string, string | string[] | undefined>;
  get?: (name: string) => string | null;
};

function readHeader(source: HeaderSource, name: string): string | null {
  if (typeof source.get === "function") {
    return source.get(name) ?? source.get(name.toLowerCase());
  }
  const headers = source.headers ?? {};
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0] ?? null;
  return direct ?? null;
}

/**
 * Validates integration webhooks when WEBHOOK_SECRET is set.
 * WEBHOOK_AUTH_DISABLED=1 skips check (local dev only).
 */
export function verifyWebhookSecret(source: HeaderSource): { ok: true } | { ok: false; error: string } {
  if (isWebhookAuthDisabled()) return { ok: true };

  const secret = getWebhookSecret();
  if (!secret) return { ok: true };

  const provided =
    readHeader(source, "x-webhook-secret") ??
    readHeader(source, "authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!provided || provided !== secret) {
    return { ok: false, error: "Unauthorized webhook" };
  }
  return { ok: true };
}
