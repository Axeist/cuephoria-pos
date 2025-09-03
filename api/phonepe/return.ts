export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 Return handler starting");
  
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    const phonepeStatus = url.searchParams.get("status");
    
    console.log("📊 Return parameters:", { orderId, phonepeStatus });
    
    // Get and validate base URL
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
    if (!SITE_URL) {
      console.error("❌ NEXT_PUBLIC_SITE_URL not configured");
      return new Response("Configuration error", { status: 500 });
    }

    // Normalize base URL (remove trailing slashes)
    const baseUrl = SITE_URL.replace(/\/+$/, '');
    
    // Test if base URL is valid
    try {
      new URL(baseUrl);
    } catch (e) {
      console.error("❌ Invalid NEXT_PUBLIC_SITE_URL:", baseUrl);
      return new Response("Invalid site URL configuration", { status: 500 });
    }

    // Construct redirect URL safely
    const redirectPath = "/public/booking";
    const fullRedirectUrl = `${baseUrl}${redirectPath}`;
    
    console.log("✅ Base URL validated:", baseUrl);
    
    const redirectUrl = new URL(fullRedirectUrl);
    
    // Add query parameters based on return status
    if (orderId) {
      redirectUrl.searchParams.set("order", orderId);
      // Always set as success initially, frontend will verify
      redirectUrl.searchParams.set("pp", "success");
    } else {
      redirectUrl.searchParams.set("pp", "failed");
      redirectUrl.searchParams.set("msg", "missing-order-id");
    }
    
    const finalRedirectUrl = redirectUrl.toString();
    console.log("⚡ Redirecting to:", finalRedirectUrl);
    
    return Response.redirect(finalRedirectUrl, 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    
    // Emergency fallback
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
