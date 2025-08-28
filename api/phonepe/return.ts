// api/phonepe/return.ts
export const config = { runtime: 'edge' };

function htmlRedirect(to: string) {
  const safe = to.replace(/"/g, '&quot;');
  const html = `<!doctype html>
<meta http-equiv="refresh" content="0;url=${safe}">
<title>Redirecting…</title>
<script>location.replace(${JSON.stringify(safe)})</script>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}

export default async function handler(req: Request) {
  const url = new URL(req.url);

  const status = (url.searchParams.get('status') || '').toLowerCase(); // success|failed|pending
  const order  = url.searchParams.get('order') || '';

  // Where your public booking page lives:
  const site = process.env.NEXT_PUBLIC_SITE_URL || ''; // e.g. https://admin.cuephoria.in/public/booking
  let base = site;
  try {
    // ensure absolute https URL
    const u = new URL(base);
    if (u.protocol !== 'https:') u.protocol = 'https:';
    base = u.toString();
  } catch {
    base = `${url.protocol}//${url.host}/public/booking`;
  }

  const dest = new URL(base);
  if (status) dest.searchParams.set('pp', status);
  if (order)  dest.searchParams.set('order', order);

  return htmlRedirect(dest.toString());
}
