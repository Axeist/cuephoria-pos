export const runtime = "edge";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async function handler(req: Request) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const txnId = url.searchParams.get("txn");
    const status = (url.searchParams.get("status") || "").toLowerCase();
    
    // PhonePe might send different parameter names, let's check all possible ones
    const merchantTransactionId = url.searchParams.get("merchantTransactionId") || txnId;
    const transactionId = url.searchParams.get("transactionId") || merchantTransactionId;
    const code = url.searchParams.get("code");
    const providerReferenceId = url.searchParams.get("providerReferenceId");

    console.log("🔄 Return handler called:", { 
      method: req.method,
      url: req.url, 
      txnId, 
      status,
      merchantTransactionId,
      transactionId,
      code,
      providerReferenceId,
      allParams: Object.fromEntries(url.searchParams.entries())
    });

    // Frontend base URL
    const base = "https://admin.cuephoria.in";

    // Determine if payment was successful based on multiple indicators
    const finalTxnId = transactionId || merchantTransactionId || txnId;
    const isSuccess = Boolean(finalTxnId) && 
                      code !== "PAYMENT_ERROR" && 
                      code !== "PAYMENT_CANCELLED" &&
                      !["failed", "failure", "cancelled", "cancel", "error"].includes(status);
    
    const redirectUrl = isSuccess
      ? `${base}/public/booking?pp=success&txn=${encodeURIComponent(finalTxnId as string)}`
      : `${base}/public/booking?pp=failed&txn=${encodeURIComponent(finalTxnId || 'unknown')}`;

    console.log("🚀 Redirecting to:", redirectUrl, { isSuccess, finalTxnId });

    // Use 302 redirect with proper headers
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error) {
    console.error("❌ Return handler error:", error);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': "https://admin.cuephoria.in/public/booking?pp=failed",
        'Cache-Control': 'no-cache',
      }
    });
  }
}
