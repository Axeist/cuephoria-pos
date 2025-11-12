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
function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  return fromDeno ?? fromProcess;
}

function need(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Get Razorpay credentials (supports both test and live)
function getRazorpayCredentials() {
  // Check if we're in live mode (you can set RAZORPAY_MODE=live or use live keys)
  const mode = getEnv("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  
  const keyId = isLive 
    ? (getEnv("RAZORPAY_KEY_ID_LIVE") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_LIVE"))
    : (getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID") || need("RAZORPAY_KEY_ID_TEST"));
    
  const keySecret = isLive
    ? (getEnv("RAZORPAY_KEY_SECRET_LIVE") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_LIVE"))
    : (getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET") || need("RAZORPAY_KEY_SECRET_TEST"));

  return { keyId, keySecret, isLive };
}

// Create Razorpay order using Orders API
async function createRazorpayOrder(amount: number, receipt: string, notes?: Record<string, string>) {
  let keyId: string;
  let keySecret: string;
  
  try {
    const credentials = getRazorpayCredentials();
    keyId = credentials.keyId;
    keySecret = credentials.keySecret;
  } catch (err: any) {
    console.error("❌ Failed to get Razorpay credentials:", err);
    throw new Error(`Configuration error: ${err?.message || "Missing Razorpay credentials"}`);
  }
  
  const orderData = {
    amount: Math.round(amount * 100), // Convert to paise
    currency: "INR",
    receipt: receipt,
    notes: notes || {},
  };

  console.log("📤 Creating Razorpay order:", { 
    amount: orderData.amount, 
    receipt, 
    currency: "INR",
    keyIdPrefix: keyId?.substring(0, 10) + "..."
  });

  // Basic auth: keyId:keySecret
  const auth = btoa(`${keyId}:${keySecret}`);

  let response: Response;
  let responseText: string;
  
  try {
    response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(orderData),
    });

    responseText = await response.text();
  } catch (fetchErr: any) {
    console.error("❌ Network error calling Razorpay:", fetchErr);
    throw new Error(`Network error: ${fetchErr?.message || "Failed to connect to Razorpay"}`);
  }

  let data: any = {};
  
  try {
    data = JSON.parse(responseText);
  } catch (parseErr) {
    console.error("❌ Failed to parse Razorpay response:", {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 500)
    });
    throw new Error(`Invalid response from Razorpay (Status: ${response.status}): ${responseText.substring(0, 200)}`);
  }

  if (!response.ok) {
    console.error("❌ Razorpay order creation failed:", {
      status: response.status,
      statusText: response.statusText,
      error: data
    });
    
    const errorMsg = data.error?.description || 
                    data.error?.message || 
                    data.description ||
                    `Razorpay API error (Status: ${response.status})`;
    throw new Error(errorMsg);
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
    console.error("💥 Razorpay order error:", {
      message: err?.message,
      stack: err?.stack,
      error: err
    });
    
    // Return detailed error for debugging
    const errorMessage = err?.message || String(err);
    return j({ 
      ok: false, 
      error: errorMessage,
      // Include error type for debugging (remove in production if needed)
      type: err?.name || "UnknownError"
    }, 500);
  }
}

