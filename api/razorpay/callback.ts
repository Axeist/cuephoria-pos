export const config = { runtime: "edge" };

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
    
    // Razorpay returns payment details in query params or POST body
    const razorpayPaymentId = url.searchParams.get("razorpay_payment_id");
    const razorpayOrderId = url.searchParams.get("razorpay_order_id");
    const razorpaySignature = url.searchParams.get("razorpay_signature");
    const paymentStatus = url.searchParams.get("payment_status") || url.searchParams.get("status");
    
    // Also check POST body if it's a POST request
    let postData: any = {};
    if (req.method === "POST") {
      try {
        postData = await req.json();
      } catch {
        // Not JSON, try form data
        try {
          const formData = await req.formData();
          postData = Object.fromEntries(formData.entries());
        } catch {
          // Ignore
        }
      }
    }

    const finalPaymentId = razorpayPaymentId || postData.razorpay_payment_id;
    const finalOrderId = razorpayOrderId || postData.razorpay_order_id;
    const finalSignature = razorpaySignature || postData.razorpay_signature;
    const finalStatus = paymentStatus || postData.payment_status || postData.status;

    console.log("🔄 Razorpay callback received:", {
      method: req.method,
      paymentId: finalPaymentId,
      orderId: finalOrderId,
      status: finalStatus,
      hasSignature: !!finalSignature,
    });

    // Frontend base URL
    const base = "https://admin.cuephoria.in";

    // Determine if payment was successful
    // Razorpay typically returns success when payment_id is present
    const isSuccess = Boolean(finalPaymentId && finalOrderId) && 
                     finalStatus !== "failed" && 
                     finalStatus !== "cancelled";

    const redirectUrl = isSuccess
      ? `${base}/public/payment/success?payment_id=${encodeURIComponent(finalPaymentId || '')}&order_id=${encodeURIComponent(finalOrderId || '')}&signature=${encodeURIComponent(finalSignature || '')}`
      : `${base}/public/payment/failed?order_id=${encodeURIComponent(finalOrderId || 'unknown')}`;

    console.log("🚀 Redirecting to:", redirectUrl, { isSuccess, paymentId: finalPaymentId });

    // Create redirect response with fallback
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
        <h2>Processing payment...</h2>
        <p>If you are not automatically redirected, <a href="${redirectUrl}">click here</a></p>
        <p><small>Payment ID: ${finalPaymentId || 'Processing...'}</small></p>
    </div>
</body>
</html>`;

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
    console.error("❌ Razorpay callback error:", error);
    
    const fallbackUrl = "https://admin.cuephoria.in/public/payment/failed";
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

