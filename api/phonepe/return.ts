export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 Return handler starting");
  
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order");
    const phonepeStatus = url.searchParams.get("status");
    
    console.log("📊 Return parameters:", { orderId, phonepeStatus });
    
    // Use direct string concatenation - no URL constructor
    const bookingPageBase = "https://admin.cuephoria.in/public/booking";
    
    let redirectUrl = bookingPageBase;
    
    if (orderId) {
      redirectUrl += `?order=${encodeURIComponent(orderId)}&pp=success`;
    } else {
      redirectUrl += `?pp=failed&msg=missing-order-id`;
    }
    
    console.log("⚡ Redirecting to:", redirectUrl);
    
    return Response.redirect(redirectUrl, 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    
    // Emergency fallback - hardcoded URL
    const fallbackUrl = "https://admin.cuephoria.in/public/booking?pp=failed&msg=handler-error";
    console.log("🚨 Emergency redirect:", fallbackUrl);
    
    return Response.redirect(fallbackUrl, 302);
  }
}
