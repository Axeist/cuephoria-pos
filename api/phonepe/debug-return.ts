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
    
    console.log("🔍 DEBUG Return handler called:", {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      allParams: Object.fromEntries(url.searchParams.entries())
    });

    // Return detailed information about what we received
    const debugInfo = {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      queryParams: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(req.headers.entries()),
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
    };

    const debugHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PhonePe Return Debug</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .info { color: #17a2b8; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .param { margin: 10px 0; padding: 10px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .param strong { color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 PhonePe Return Handler Debug</h1>
        <p class="info">This page shows what PhonePe sent to your return handler.</p>
        
        <h2>📋 Query Parameters</h2>
        ${Object.entries(debugInfo.queryParams).map(([key, value]) => 
          `<div class="param"><strong>${key}:</strong> ${value}</div>`
        ).join('')}
        
        <h2>📊 Full Debug Information</h2>
        <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
        
        <h2>🧪 Test Links</h2>
        <p>Test different scenarios:</p>
        <ul>
            <li><a href="?merchantTransactionId=TEST123&status=success&code=SUCCESS">Simulate Success</a></li>
            <li><a href="?merchantTransactionId=TEST123&status=failed&code=PAYMENT_ERROR">Simulate Failure</a></li>
            <li><a href="?merchantTransactionId=TEST123&status=cancelled&code=PAYMENT_CANCELLED">Simulate Cancellation</a></li>
        </ul>
        
        <h2>🔗 Next Steps</h2>
        <p>If you see parameters here, your return handler is working. The issue might be in the redirect logic.</p>
        <p><a href="https://admin.cuephoria.in/public/booking">← Back to Booking Page</a></p>
    </div>
</body>
</html>`;

    return new Response(debugHtml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (error) {
    console.error("❌ Debug return handler error:", error);
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Debug Error</title>
</head>
<body>
    <h1>❌ Debug Error</h1>
    <p>Error: ${error}</p>
    <p><a href="https://admin.cuephoria.in/public/booking">← Back to Booking Page</a></p>
</body>
</html>`;
    
    return new Response(errorHtml, {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      }
    });
  }
}
