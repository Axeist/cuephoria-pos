export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 Return handler starting");
  
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    const phonepeStatus = url.searchParams.get("status");
    
    console.log("📊 Return parameters:", { orderId, phonepeStatus });
    
    // Use the complete booking page URL
    const BOOKING_PAGE_URL = process.env.NEXT_PUBLIC_BOOKING_PAGE_URL;
    if (!BOOKING_PAGE_URL) {
      console.error("❌ NEXT_PUBLIC_BOOKING_PAGE_URL not configured");
      return new Response("Configuration error: Missing booking page URL", { status: 500 });
    }

    console.log("✅ Using booking page URL:", BOOKING_PAGE_URL);

    // Create redirect URL by appending query parameters
    const redirectUrl = new URL(BOOKING_PAGE_URL);
    
    if (orderId) {
      redirectUrl.searchParams.set("order", orderId);
      redirectUrl.searchParams.set("pp", "success"); // Always set success, frontend will verify
    } else {
      redirectUrl.searchParams.set("pp", "failed");
      redirectUrl.searchParams.set("msg", "missing-order-id");
    }
    
    const finalRedirectUrl = redirectUrl.toString();
    console.log("⚡ Redirecting to:", finalRedirectUrl);
    
    return Response.redirect(finalRedirectUrl, 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    
    // Emergency fallback with full URL
    const fallbackUrl = "https://admin.cuephoria.in/public/booking?pp=failed&msg=handler-error";
    console.log("🚨 Emergency redirect to:", fallbackUrl);
    
    try {
      return Response.redirect(fallbackUrl, 302);
    } catch (fallbackError) {
      console.error("💥 Fallback also failed:", fallbackError);
      return new Response(`Critical error: ${error}`, { status: 500 });
    }
  }
}
