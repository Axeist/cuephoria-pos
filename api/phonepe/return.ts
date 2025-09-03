export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 PhonePe return handler - FAST response");
  
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    
    console.log("📊 Quick redirect for order:", orderId);
    
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
    if (!SITE_URL) {
      console.error("❌ SITE_URL missing");
      return new Response("Configuration error", { status: 500 });
    }

    // IMMEDIATE redirect - no status checking here
    const redirectUrl = new URL(`${SITE_URL}/public/booking`);
    
    if (orderId) {
      redirectUrl.searchParams.set("pp", "success");
      redirectUrl.searchParams.set("order", orderId);
    } else {
      redirectUrl.searchParams.set("pp", "failed");
      redirectUrl.searchParams.set("msg", "no-order-id");
    }
    
    console.log("⚡ IMMEDIATE redirect to:", redirectUrl.toString());
    
    // Return redirect response IMMEDIATELY
    return Response.redirect(redirectUrl.toString(), 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    
    // Emergency redirect
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://admin.cuephoria.in";
    const emergencyUrl = `${SITE_URL}/public/booking?pp=failed&msg=handler-error`;
    
    return Response.redirect(emergencyUrl, 302);
  }
}
