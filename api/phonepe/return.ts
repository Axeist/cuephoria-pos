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
    const responseCode = url.searchParams.get("responseCode");

    console.log("🔄 Return handler called:", { 
      method: req.method,
      url: req.url, 
      txnId, 
      status,
      merchantTransactionId,
      transactionId,
      code,
      responseCode,
      providerReferenceId,
      allParams: Object.fromEntries(url.searchParams.entries())
    });

    // Additional debugging for PhonePe specific parameters
    console.log("📋 PhonePe specific parameters:", {
      code: url.searchParams.get("code"),
      responseCode: url.searchParams.get("responseCode"),
      state: url.searchParams.get("state"),
      message: url.searchParams.get("message"),
      providerReferenceId: url.searchParams.get("providerReferenceId"),
      transactionId: url.searchParams.get("transactionId"),
      merchantTransactionId: url.searchParams.get("merchantTransactionId")
    });

    // Frontend base URL
    const base = "https://admin.cuephoria.in";

    // Determine if payment was successful based on multiple indicators
    const finalTxnId = transactionId || merchantTransactionId || txnId;
    
    // Check for explicit success indicators
    const hasSuccessCode = code === "SUCCESS" || responseCode === "SUCCESS";
    const hasSuccessStatus = status === "success" || status === "completed";
    
    // Check for explicit failure indicators
    const hasFailureCode = code === "PAYMENT_ERROR" || 
                          code === "PAYMENT_CANCELLED" || 
                          code === "CANCELLED" ||
                          code === "FAILED" ||
                          responseCode === "PAYMENT_ERROR" || 
                          responseCode === "PAYMENT_CANCELLED" ||
                          responseCode === "CANCELLED" ||
                          responseCode === "FAILED";
    const hasFailureStatus = ["failed", "failure", "cancelled", "cancel", "error", "aborted", "timeout"].includes(status);
    
    // If we have explicit success indicators, it's a success
    // If we have explicit failure indicators, it's a failure
    // Otherwise, if we have a transaction ID and no explicit failure, assume success
    const isSuccess = (hasSuccessCode || hasSuccessStatus) || 
                      (Boolean(finalTxnId) && !hasFailureCode && !hasFailureStatus);
    
    console.log("🎯 Success determination:", {
      finalTxnId,
      hasSuccessCode,
      hasSuccessStatus,
      hasFailureCode,
      hasFailureStatus,
      isSuccess
    });
    
    const redirectUrl = isSuccess
      ? `${base}/public/booking?pp=success&txn=${encodeURIComponent(finalTxnId as string)}`
      : `${base}/public/booking?pp=failed&txn=${encodeURIComponent(finalTxnId || 'unknown')}`;

    console.log("🚀 Redirecting to:", redirectUrl, { isSuccess, finalTxnId });

    // Create a more robust redirect response with fallback
    const redirectHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <meta http-equiv="refresh" content="0;url=${redirectUrl}">
    <script>
        // Immediate redirect
        window.location.href = "${redirectUrl}";
        
        // Fallback redirect after 1 second
        setTimeout(function() {
            window.location.href = "${redirectUrl}";
        }, 1000);
        
        // Final fallback after 3 seconds
        setTimeout(function() {
            window.location.href = "${redirectUrl}";
        }, 3000);
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>Redirecting...</h2>
        <p>If you are not automatically redirected, <a href="${redirectUrl}">click here</a></p>
        <p><small>Transaction ID: ${finalTxnId || 'Unknown'}</small></p>
    </div>
</body>
</html>`;

    // Use 302 redirect with proper headers and HTML fallback
    return new Response(redirectHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("❌ Return handler error:", error);
    
    const fallbackUrl = "https://admin.cuephoria.in/public/booking?pp=failed";
    const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Payment Error</title>
    <meta http-equiv="refresh" content="3;url=${fallbackUrl}">
    <script>
        setTimeout(function() {
            window.location.href = "${fallbackUrl}";
        }, 3000);
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>Payment Processing Error</h2>
        <p>There was an issue processing your payment. You will be redirected shortly.</p>
        <p>If you are not automatically redirected, <a href="${fallbackUrl}">click here</a></p>
    </div>
</body>
</html>`;
    
    return new Response(fallbackHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  }
}
