export const runtime = "edge";

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    
    console.log("Return handler called:", { orderId, searchParams: url.search });
    
    if (!orderId) {
      console.error("Missing order parameter");
      return new Response("Missing 'order' in return URL", { status: 400 });
    }

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
    if (!SITE_URL) {
      throw new Error("NEXT_PUBLIC_SITE_URL not configured");
    }

    // Verify payment status server-to-server
    let state: string | null = null;
    try {
      const statusRes = await fetch(
        `${SITE_URL}/api/phonepe/status?order=${encodeURIComponent(orderId)}`,
        { 
          headers: { "cache-control": "no-cache" },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        state = statusData?.state || null;
        console.log("Payment verification result:", { state, orderId });
      }
    } catch (error) {
      console.error("Status check failed:", error);
    }

    // Map to query params for the SPA
    let pp = "pending";
    if (state === "COMPLETED") pp = "success";
    else if (state === "FAILED") pp = "failed";
    
    console.log("Redirecting with status:", { pp, orderId });
    
    // Redirect back to booking page with status
    const forward = new URL(`${SITE_URL}/public/booking`);
    forward.searchParams.set("pp", pp);
    forward.searchParams.set("order", orderId);
    
    return Response.redirect(forward.toString(), 302);
    
  } catch (error) {
    console.error("Return handler error:", error);
    try {
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
      const f = new URL(`${SITE_URL}/public/booking`);
      f.searchParams.set("pp", "failed");
      f.searchParams.set("msg", "return-handler-error");
      return Response.redirect(f.toString(), 302);
    } catch {
      return new Response("Return handler error", { status: 500 });
    }
  }
}
