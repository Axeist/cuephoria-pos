export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 Return handler starting");
  
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    
    console.log("📊 Processing return for order:", orderId);
    
    // Get and validate base URL
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
    if (!SITE_URL) {
      console.error("❌ NEXT_PUBLIC_SITE_URL is not set");
      return new Response("Configuration error: Missing site URL", { status: 500 });
    }

    // Normalize base URL (remove trailing slashes)
    const baseUrl = SITE_URL.replace(/\/+$/, '');
    
    // Validate base URL format
    try {
      new URL(baseUrl); // Test if valid URL
    } catch (e) {
      console.error("❌ Invalid NEXT_PUBLIC_SITE_URL format:", baseUrl);
      return new Response("Configuration error: Invalid site URL", { status: 500 });
    }

    console.log("✅ Using base URL:", baseUrl);

    // Construct redirect URL safely
    const redirectPath = "/public/booking";
    const fullRedirectUrl = `${baseUrl}${redirectPath}`;
    
    const redirectUrl = new URL(fullRedirectUrl);
    
    // Add query parameters
    if (orderId) {
      redirectUrl.searchParams.set("pp", "success");
      redirectUrl.searchParams.set("order", orderId);
    } else {
      redirectUrl.searchParams.set("pp", "failed");
      redirectUrl.searchParams.set("msg", "missing-order-id");
    }
    
    const finalRedirectUrl = redirectUrl.toString();
    console.log("⚡ Redirecting to:", finalRedirectUrl);
    
    return Response.redirect(finalRedirectUrl, 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    
    // Emergency fallback redirect
    try {
      const fallbackUrl = "https://admin.cuephoria.in/public/booking?pp=failed&msg=handler-error";
      console.log("🚨 Emergency redirect to:", fallbackUrl);
      return Response.redirect(fallbackUrl, 302);
    } catch (fallbackError) {
      console.error("💥 Even fallback failed:", fallbackError);
      return new Response(`Redirect failed: ${error.message}`, { status: 500 });
    }
  }
}
