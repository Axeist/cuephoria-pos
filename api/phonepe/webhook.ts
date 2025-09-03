export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    console.log("📥 PhonePe webhook received:", {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const body = await req.text();
    console.log("📄 Webhook payload:", body);

    let webhookData: any = null;
    try {
      webhookData = JSON.parse(body);
      console.log("✅ Parsed webhook:", JSON.stringify(webhookData, null, 2));
    } catch (e) {
      console.error("❌ Failed to parse webhook body:", e);
    }

    if (webhookData) {
      const event = webhookData.event;
      const payload = webhookData.payload;
      
      if (payload) {
        const orderId = payload.merchantOrderId || payload.orderId;
        const state = payload.state;
        const amount = payload.amount;
        
        console.log(`💳 Webhook: ${event} | Order: ${orderId} | State: ${state} | Amount: ${amount}`);
      }
    }

    // Always respond 200 OK quickly
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
}
