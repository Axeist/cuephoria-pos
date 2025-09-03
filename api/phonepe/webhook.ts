export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    console.log("📥 PhonePe webhook received:", {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString(),
    });

    // Get Authorization header for validation
    const authHeader = req.headers.get('authorization');
    console.log("🔐 Authorization header:", authHeader);

    // Get the raw payload
    const body = await req.text();
    console.log("📄 Raw webhook body:", body);

    let webhookData: any = null;
    try {
      // PhonePe sends JSON payload directly
      webhookData = JSON.parse(body);
      console.log("✅ Parsed webhook data:", JSON.stringify(webhookData, null, 2));
    } catch (e) {
      console.error("❌ Failed to parse webhook body:", e);
    }

    // Extract event and payment information
    if (webhookData) {
      const event = webhookData.event;
      const payload = webhookData.payload;
      
      if (payload) {
        const orderId = payload.merchantOrderId || payload.orderId;
        const state = payload.state;
        const amount = payload.amount;
        
        console.log(`💳 Webhook Event: ${event} | Order: ${orderId} | State: ${state} | Amount: ${amount}`);
        
        // Log different event types
        switch (event) {
          case 'checkout.order.completed':
            console.log("✅ Payment completed successfully");
            break;
          case 'checkout.order.failed':
            console.log("❌ Payment failed or cancelled");
            break;
          case 'pg.refund.accepted':
            console.log("💰 Refund request accepted");
            break;
          case 'pg.refund.completed':
            console.log("✅ Refund completed");
            break;
          case 'pg.refund.failed':
            console.log("❌ Refund failed");
            break;
          default:
            console.log("ℹ️ Unknown event type:", event);
        }
      }
    }

    // ⚠️ CRITICAL: Always respond with 200 OK quickly
    return new Response("OK", { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    // Still return 200 to prevent PhonePe retries
    return new Response("OK", { status: 200 });
  }
}
