export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

// Edge-safe env getter
function need(name: string) {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  const v = fromDeno ?? fromProcess;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Get Razorpay credentials (supports both test and live)
function getRazorpayCredentials() {
  // Check if we're in live mode (you can set RAZORPAY_MODE=live or use live keys)
  const mode = need("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  
  const keyId = isLive 
    ? (need("RAZORPAY_KEY_ID_LIVE") || need("RAZORPAY_KEY_ID"))
    : (need("RAZORPAY_KEY_ID_TEST") || need("RAZORPAY_KEY_ID"));
    
  const keySecret = isLive
    ? (need("RAZORPAY_KEY_SECRET_LIVE") || need("RAZORPAY_KEY_SECRET"))
    : (need("RAZORPAY_KEY_SECRET_TEST") || need("RAZORPAY_KEY_SECRET"));

  return { keyId, keySecret, isLive };
}

// Create Razorpay order using Orders API
async function createRazorpayOrder(amount: number, receipt: string, notes?: Record<string, string>) {
  const { keyId, keySecret } = getRazorpayCredentials();
  
  const orderData = {
    amount: Math.round(amount * 100), // Convert to paise
    currency: "INR",
    receipt: receipt,
    notes: notes || {},
  };

  console.log("📤 Creating Razorpay order:", { amount, receipt, currency: "INR" });

  // Basic auth: keyId:keySecret
  const auth = btoa(`${keyId}:${keySecret}`);

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
    },
    body: JSON.stringify(orderData),
  });

  const responseText = await response.text();
  let data: any = {};
  
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error("❌ Failed to parse Razorpay response:", responseText);
    throw new Error("Invalid response from Razorpay");
  }

  if (!response.ok) {
    console.error("❌ Razorpay order creation failed:", data);
    throw new Error(data.error?.description || data.error?.message || "Order creation failed");
  }

  console.log("✅ Razorpay order created:", data.id);
  return data;
}

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return j({}, 200);
  }

  if (req.method !== "POST") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json().catch(() => ({} as any));
    const {
      amount,
      receipt,
      notes,
    } = payload || {};

    console.log("💳 Razorpay order request:", { amount, receipt });

    if (!amount || Number(amount) <= 0) {
      return j({ ok: false, error: "Amount must be > 0" }, 400);
    }

    if (!receipt) {
      return j({ ok: false, error: "Receipt ID is required" }, 400);
    }

    const order = await createRazorpayOrder(Number(amount), receipt, notes);

    return j({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (err: any) {
    console.error("💥 Razorpay order error:", err);
    return j({ 
      ok: false, 
      error: String(err?.message || err) 
    }, 500);
  }
}

