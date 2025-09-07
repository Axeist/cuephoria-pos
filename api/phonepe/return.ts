export const runtime = "edge";

export default async function handler(req: Request) {
  console.log("🔄 Return handler starting");
  
  try {
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || '';
    const params = new URLSearchParams(queryString);
    
    const txnId = params.get("txn");
    const phonepeStatus = params.get("status");
    
    console.log("📊 Return parameters:", { txnId, phonepeStatus });
    
    let redirectUrl;
    
    if (txnId && phonepeStatus !== 'failed') {
      // Redirect to your success page with transaction ID
      redirectUrl = `https://admin.cuephoria.in/public/payment/success?txn=${encodeURIComponent(txnId)}`;
    } else {
      // Redirect to your failure page
      redirectUrl = `https://admin.cuephoria.in/public/payment/failed`;
    }
    
    console.log("⚡ Redirecting to:", redirectUrl);
    return Response.redirect(redirectUrl, 302);
    
  } catch (error) {
    console.error("💥 Return handler error:", error);
    return Response.redirect("https://admin.cuephoria.in/public/payment/failed", 302);
  }
}
