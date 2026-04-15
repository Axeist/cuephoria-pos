import { createClient } from '@supabase/supabase-js';
import {
  CAFE_SESSION_COOKIE,
  j,
  getEnv,
  needEnv,
  cookieSerialize,
  signCafeSession,
} from '../../src/server/cafeApiUtils';

export const config = { runtime: 'edge' };

function getSupabaseUrl() {
  return getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || needEnv('VITE_SUPABASE_URL');
}

function getSupabaseServiceRoleKey() {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_KEY');
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return j({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const serviceKey = getSupabaseServiceRoleKey();
    if (!serviceKey) {
      return j({ ok: false, error: 'Server misconfigured: missing service role key' }, 500);
    }

    const supabase = createClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const payload = await req.json().catch(() => ({}));
    const username = String(payload?.username || '').trim();
    const password = String(payload?.password || '');

    if (!username || !password) {
      return j({ ok: false, error: 'Missing username/password' }, 400);
    }

    const { data: userRow, error: userErr } = await supabase
      .from('cafe_users')
      .select('id, location_id, partner_id, username, password, display_name, role, is_active')
      .eq('username', username)
      .maybeSingle();

    if (userErr || !userRow) {
      return j({ ok: true, success: false, error: 'Invalid credentials' }, 200);
    }

    if (!userRow.is_active) {
      return j({ ok: true, success: false, error: 'Account is deactivated' }, 200);
    }

    const passwordMatch = userRow.password === password;
    if (!passwordMatch) {
      return j({ ok: true, success: false, error: 'Invalid credentials' }, 200);
    }

    const sessionUser = {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name || userRow.username,
      role: userRow.role,
      partnerId: userRow.partner_id,
      locationId: userRow.location_id,
    };

    const sessionToken = await signCafeSession(sessionUser, 12 * 60 * 60);

    const setCookie = cookieSerialize(CAFE_SESSION_COOKIE, sessionToken, {
      maxAgeSeconds: 12 * 60 * 60,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    });

    return j(
      { ok: true, success: true, user: sessionUser },
      200,
      { 'set-cookie': setCookie }
    );
  } catch (err: any) {
    console.error('Cafe login error:', err);
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}
