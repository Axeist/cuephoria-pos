function env(name: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? (process.env as Record<string, string | undefined>)?.[name] : undefined;
  return fromProcess ?? (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } }).Deno?.env?.get?.(
    name,
  );
}

/** When true, reject booking/payment amount mismatches. Default off for safe rollout. */
export function isStrictPricingEnabled(): boolean {
  return env("SECURITY_STRICT_PRICING") === "1" || env("SECURITY_STRICT_PRICING") === "true";
}

export function isWebhookAuthDisabled(): boolean {
  return env("WEBHOOK_AUTH_DISABLED") === "1" || env("WEBHOOK_AUTH_DISABLED") === "true";
}

export function getWebhookSecret(): string | undefined {
  const v = env("WEBHOOK_SECRET");
  return v && v.trim().length > 0 ? v.trim() : undefined;
}
