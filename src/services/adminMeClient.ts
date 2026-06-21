/**
 * Deduped /api/admin/me fetch — avoids duplicate Vercel invocations on boot
 * (AuthContext + OrganizationContext) and during rapid refocus.
 */

export type AdminMeJson = Record<string, unknown> & {
  ok?: boolean;
  user?: Record<string, unknown>;
  organization?: Record<string, unknown> | null;
  csrfToken?: string;
  error?: string;
};

export type AdminMeResult = {
  res: Response;
  json: AdminMeJson;
};

const CACHE_TTL_MS = 30_000;

let cache: { at: number; result: AdminMeResult } | null = null;
let inflight: Promise<AdminMeResult> | null = null;

export async function fetchAdminMe(options?: { force?: boolean }): Promise<AdminMeResult> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && cache && now - cache.at < CACHE_TTL_MS) {
    return cache.result;
  }

  if (!force && inflight) {
    return inflight;
  }

  inflight = (async () => {
    const res = await fetch('/api/admin/me', { method: 'GET', credentials: 'same-origin' });
    const json = (await res.json().catch(() => ({}))) as AdminMeJson;
    const result = { res, json };
    cache = { at: Date.now(), result };
    return result;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function clearAdminMeCache(): void {
  cache = null;
}
