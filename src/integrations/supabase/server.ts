// Server-side Supabase client for API routes
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Edge-safe env getter (Vercel Edge/Serverless)
function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess =
    typeof process !== 'undefined' ? (process.env as any)?.[name] : undefined;
  const fromGlobalProcess = (globalThis as any)?.process?.env?.[name];
  return fromDeno ?? fromProcess ?? fromGlobalProcess;
}

const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');

// Prefer service role key for server-side privileged operations (admin APIs, webhooks).
const SUPABASE_KEY =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnv('SUPABASE_SERVICE_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing server Supabase env vars (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)');
}

// Server-side client without browser-specific features
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'x-application-name': 'cuephoria-api'
    }
  }
});

