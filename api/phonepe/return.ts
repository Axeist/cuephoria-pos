export const runtime = "edge";

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    const phonepeStatus = url.searchParams.get("status");
    
    console.log("🔄 PhonePe return handler:", { orderId, phonepeStatus, url: req.url });
    
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
    if (!SITE_URL) {
      throw new Error("NEXT_PUBLIC_SITE_URL not configured");
    }

    if (!orderId) {
      console.error("❌ Missing order parameter");
      const fallbackUrl = new URL(`${SITE_URL}/public/booking`);
      fallbackUrl.searchParams.set("pp", "failed");
      fallbackUrl.searchParams.set("msg", "missing-order-id");
      return Response.redirect(fallbackUrl.toString(), 302);
    }

    // Verify payment status
    let state: string | null = null;
    try {
      console.log("🔍 Verifying payment status...");
      
      const statusRes = await fetch(
        `${SITE_URL}/api/phonepe/status?order=${encodeURIComponent(orderId)}`,
        { 
          headers: { "cache-control": "no-cache" },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        state = statusData?.state || null;
        console.log("✅ Payment status verified:", { orderId, state });
      } else {
        console.warn("⚠️ Status API returned non-OK:", statusRes.status);
      }
    } catch (error) {
      console.error("❌ Status verification failed:", error);
    }

    // Determine final status
    let pp = "pending";
    if (state === "COMPLETED") {
      pp = "success";
    } else if (state === "FAILED" || phonepeStatus === "failed") {
      pp = "failed";
    } else if (!state) {
      // If we can't determine status, default to failed for safety
      pp = "failed";
    }
    
    console.log("🎯 Redirecting with status:", { orderId, pp, originalState: state });
    
    // Redirect to booking page with status
    const redirectUrl = new URL(`${SITE_URL}/public/booking`);
    redirectUrl.searchParams.set("pp", pp);
    redirectUrl.searchParams.set("order", orderId);
    
    return Response.redirect(redirectUrl.toString(), 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    try {
      const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://admin.cuephoria.in";
      const emergencyUrl = new URL(`${SITE_URL}/public/booking`);
      emergencyUrl.searchParams.set("pp", "failed");
      emergencyUrl.searchParams.set("msg", "return-error");
      return Response.redirect(emergencyUrl.toString(), 302);
    } catch {
      return new Response("Critical redirect error", { status: 500 });
    }
  }
}
