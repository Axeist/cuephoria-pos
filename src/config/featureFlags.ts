/**
 * Feature flags — single source of truth (client + server safe).
 *
 * Principles
 * ----------
 * 1. Off-by-default. Every new multi-tenant / Cuetronix feature starts `false`
 *    and is flipped on per environment via the appropriate env var.
 * 2. Read-only at runtime. Consumers use `flags.multiTenantEnabled`, not a
 *    function — so it's easy to grep and trivially tree-shakeable.
 * 3. Works in both Vite (`import.meta.env.VITE_*`) and Edge/Node
 *    (`process.env`, `Deno.env`) contexts.
 */

function readEnv(name: string): string | undefined {
  // Vite client env (must be prefixed VITE_).
  try {
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    if (meta && typeof meta[name] === "string") return meta[name] as string;
  } catch {
    /* not Vite */
  }
  // Node / Vercel edge.
  if (typeof process !== "undefined" && process.env && typeof process.env[name] === "string") {
    return process.env[name];
  }
  // Deno (Supabase functions).
  const d = (globalThis as unknown as { Deno?: { env?: { get?: (k: string) => string | undefined } } }).Deno;
  if (d?.env?.get) return d.env.get(name);
  return undefined;
}

function asBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export const flags = {
  /**
   * Master switch for multi-tenant behavior (org resolution in APIs, tenant
   * switcher UI, RLS later). Off → the app behaves exactly like single-tenant
   * Cuephoria. On → Cuetronix machinery engages.
   */
  multiTenantEnabled: asBool(
    readEnv("VITE_MULTI_TENANT_ENABLED") ?? readEnv("MULTI_TENANT_ENABLED"),
    false,
  ),

  /**
   * Show the Cuetronix platform-admin console at /platform/*.
   * Independent of the master switch: platform admins can operate the SaaS
   * even before full tenant flow is enabled (e.g. seeding/offboarding tenants).
   */
  platformAdminEnabled: asBool(
    readEnv("VITE_PLATFORM_ADMIN_ENABLED") ?? readEnv("PLATFORM_ADMIN_ENABLED"),
    true, // On by default — route only appears if `/platform/*` is visited.
  ),

  /**
   * Apply tenant CSS variable theme on boot. Safe to keep on always because
   * the default theme mirrors today's index.css exactly.
   */
  tenantThemingEnabled: asBool(
    readEnv("VITE_TENANT_THEMING_ENABLED") ?? readEnv("TENANT_THEMING_ENABLED"),
    true,
  ),

  /**
   * Require a valid Cuetronix subscription before admin login succeeds.
   * Never enforced for the internal Cuephoria org.
   */
  enforceSubscriptionGate: asBool(
    readEnv("VITE_ENFORCE_SUBSCRIPTION_GATE") ?? readEnv("ENFORCE_SUBSCRIPTION_GATE"),
    false,
  ),

  /**
   * Show public pricing + marketing surfaces. Lets us prepare pages in prod
   * without revealing them until GTM is ready.
   */
  publicPricingVisible: asBool(
    readEnv("VITE_PUBLIC_PRICING_VISIBLE") ?? readEnv("PUBLIC_PRICING_VISIBLE"),
    false,
  ),
} as const;

export type FeatureFlags = typeof flags;

/**
 * Helper for conditional logic that needs to degrade gracefully when a flag
 * is off. Prefer direct property access where possible.
 */
export function ifFlag<T>(name: keyof FeatureFlags, onValue: T, offValue: T): T {
  return flags[name] ? onValue : offValue;
}
