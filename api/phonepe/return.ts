// /api/phonepe/return.ts
export const runtime = "edge";

function need(name: string, value?: string | null) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    if (!orderId) {
      // If PhonePe doesn’t include order explicitly, show a helpful error.
      return new Response("Missing 'order' in return URL", { status: 400 });
    }

    const SITE_URL = need("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
    const origin = new URL(SITE_URL).origin;

    // Call our own /status to decide where to send the customer
    const statusRes = await fetch(`${origin}/api/phonepe/status?order=${encodeURIComponent(orderId)}`, {
      // ensure no-cors issues in edge
      headers: { "cache-control": "no-cache" },
    }).catch(() => null);

    let state: string | null = null;
    if (statusRes && statusRes.ok) {
      const j = await statusRes.json().catch(() => null);
      state = j?.state || null;
    }

    // Decide terminal redirect
    let pp = "pending";
    if (state === "COMPLETED") pp = "success";
    else if (state === "FAILED") pp = "failed";

    const forward = new URL(SITE_URL);
    forward.searchParams.set("pp", pp);
    forward.searchParams.set("order", orderId);

    return Response.redirect(forward.toString(), 302);
  } catch (err: any) {
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
