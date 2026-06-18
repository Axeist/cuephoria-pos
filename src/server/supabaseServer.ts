/**
 * supabaseServer — single factory for server-side Supabase clients.
 *
 * Consolidates the `createClient(url, serviceRoleKey, …)` pattern that was
 * previously copy-pasted into every API endpoint. Also throws a structured
 * error if envs are missing, so callers can surface a clean 500.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./adminApiUtils";

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export function supabaseServiceClient(appName = "cuetronix-api"): SupabaseClient {
  const url = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");
  if (!url || !key) {
    throw new SupabaseConfigError(
      "Supabase server envs missing: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": appName } },
  });
}
