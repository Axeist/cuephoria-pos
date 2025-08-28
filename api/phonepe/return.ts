// api/phonepe/return.ts
export const runtime = "edge";

function need(name: string, value?: string | null) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order"); // we put this in pay.ts redirects
    // status param from PhonePe is not trusted for final result; we always verify below
    if (!orderId) {
      return new Response("Missing 'order' in return URL", { status: 400 });
    }

    const SITE_URL = need("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
    const origin = new URL(SITE_URL).origin;

    // Verify server-to-server before landing user
    const statusRes = await fetch(
      `${origin}/api/phonepe/status?order=${encodeURIComponent(orderId)}`,
      { headers: { "cache-control": "no-cache" } }
    ).catch(() => null);

    let state: string | null = null;
    if (statusRes && statusRes.ok) {
      const jj = await statusRes.json().catch(() => null);
      state = jj?.state || null;
    }

    // Map to a compact query param for the SPA
    let pp = "pending";
    if (state === "COMPLETED") pp = "success";
    else if (state === "FAILED") pp = "failed";

    const forward = new URL(SITE_URL);
    forward.searchParams.set("pp", pp);
    forward.searchParams.set("order", orderId);

    return Response.redirect(forward.toString(), 302);
  } catch {
    // If anything blows up, at least land them on booking with a failure flag
    try {
      const SITE_URL = need("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
      const f = new URL(SITE_URL);
      f.searchParams.set("pp", "failed");
      f.searchParams.set("msg", "return-handler-error");
      return Response.redirect(f.toString(), 302);
    } catch {
      return new Response("Return handler error", { status: 500 });
    }
  }
}
