export const runtime = "edge";

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const txnId = url.searchParams.get("txn");
    const status = (url.searchParams.get("status") || "").toLowerCase();

    console.log("🔄 Return handler called:", { 
      method: req.method,
      url: req.url, 
      txnId, 
      status,
      searchParams: Object.fromEntries(url.searchParams.entries())
    });

    // Frontend base URL
    const base = "https://admin.cuephoria.in";

    const isSuccess = Boolean(txnId) && !["failed", "failure", "cancelled", "cancel"].includes(status);
    
    const redirectUrl = isSuccess
      ? `${base}/public/booking?pp=success&txn=${encodeURIComponent(txnId as string)}`
      : `${base}/public/booking?pp=failed&txn=${encodeURIComponent(txnId || 'unknown')}`;

    console.log("🚀 Redirecting to:", redirectUrl);

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("❌ Return handler error:", error);
    return Response.redirect("https://admin.cuephoria.in/public/booking?pp=failed", 302);
  }
}
