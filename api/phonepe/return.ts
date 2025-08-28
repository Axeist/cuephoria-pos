// api/phonepe/return.ts
export const config = { runtime: 'edge' };

// simple HTML-redirect helper
function htmlRedirect(to: string) {
  const safe = to.replace(/"/g, '&quot;');
  const body = `<!doctype html>
<meta http-equiv="refresh" content="0;url=${safe}">
<title>Redirecting…</title>
<script>location.replace(${JSON.stringify(safe)})</script>`;
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const status = (url.searchParams.get('status') || '').toLowerCase(); // success | failed | pending
    const order  = url.searchParams.get('order') || '';
    const site   = process.env.NEXT_PUBLIC_SITE_URL || '';

    // fallback if env is missing
    let targetBase = site || `${url.protocol}//${url.host}/public/booking`;

    // normalize to absolute https
    try {
      const u = new URL(targetBase);
      if (u.protocol !== 'https:') u.protocol = 'https:';
      targetBase = u.toString();
    } catch {
      targetBase = `${url.protocol}//${url.host}/public/booking`;
    }

    const dest = new URL(targetBase);
    if (status) dest.searchParams.set('pp', status);
    if (order)  dest.searchParams.set('order', order);

    return htmlRedirect(dest.toString());
  } catch (e) {
    return new Response('Redirect error', { status: 400 });
  }
}
