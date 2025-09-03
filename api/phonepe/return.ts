export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 Return handler starting");
  
  try {
    // Extract query parameters from URL string directly (no URL constructor)
    const urlString = req.url;
    const urlParts = urlString.split('?');
    const queryString = urlParts[1] || '';
    const params = new URLSearchParams(queryString);
    
    const orderId = params.get("order");
    const phonepeStatus = params.get("status");
    
    console.log("📊 Return parameters:", { orderId, phonepeStatus, urlString });
    
    // Use environment variable or hardcoded fallback
    const bookingPageUrl = process.env.NEXT_PUBLIC_BOOKING_PAGE_URL || "https://admin.cuephoria.in/public/booking";
    
    // Build redirect URL with string concatenation (safest approach)
    let redirectUrl;
    
    if (orderId) {
      redirectUrl = `${bookingPageUrl}?order=${encodeURIComponent(orderId)}&pp=success`;
    } else {
      redirectUrl = `${bookingPageUrl}?pp=failed&msg=missing-order-id`;
    }
    
    console.log("⚡ Redirecting to:", redirectUrl);
    
    return Response.redirect(redirectUrl, 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    
    // Hardcoded emergency fallback
    const fallbackUrl = "https://admin.cuephoria.in/public/booking?pp=failed&msg=handler-error";
    console.log("🚨 Emergency redirect to:", fallbackUrl);
    
    return Response.redirect(fallbackUrl, 302);
  }
}
