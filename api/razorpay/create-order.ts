// Using Node.js runtime to use Razorpay SDK
// export const config = { runtime: "edge" };

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: any;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  end: () => void;
};

function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

// Environment variable getter (Node.js runtime)
function getEnv(name: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return (process.env as any)[name];
  }
  // Fallback for Edge runtime
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  return fromDeno;
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

  // Validate key format
  if (isLive && !keyId.startsWith("rzp_live_")) {
    console.warn("⚠️ Live mode but key doesn't start with 'rzp_live_'");
  } else if (!isLive && !keyId.startsWith("rzp_test_")) {
    console.warn("⚠️ Test mode but key doesn't start with 'rzp_test_'");
  }

  return { keyId, keySecret, isLive };
}

// Create Razorpay order using Razorpay SDK (Node.js runtime)
async function createRazorpayOrder(amount: number, receipt: string, notes?: Record<string, string>) {
  // Import Razorpay SDK
  const Razorpay = (await import('razorpay')).default;
  
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
  
  // Validate amount and ensure it's an integer
  const amountInPaise = Math.round(Number(amount) * 100);
  if (amountInPaise < 100) {
    throw new Error("Amount must be at least ₹1.00 (100 paise)");
  }
  if (!Number.isInteger(amountInPaise)) {
    throw new Error("Amount must be a valid number");
  }

  // Initialize Razorpay client
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  // Build order options
  const orderOptions: any = {
    amount: amountInPaise, // Amount in paise
    currency: "INR",
    receipt: receipt.substring(0, 40).trim(), // Razorpay has 40 char limit
  };
  
  // Only include notes if it has content and is a valid object
  if (notes && typeof notes === 'object' && Object.keys(notes).length > 0) {
    // Validate notes - each value must be string and max 256 chars
    const validNotes: Record<string, string> = {};
    for (const [key, value] of Object.entries(notes)) {
      if (key && value && typeof value === 'string' && value.length <= 256) {
        validNotes[key] = value;
      }
    }
    if (Object.keys(validNotes).length > 0) {
      orderOptions.notes = validNotes;
    }
  }

  console.log("📤 Creating Razorpay order with SDK:", { 
    amount: orderOptions.amount, 
    receipt: orderOptions.receipt, 
    currency: orderOptions.currency,
    hasNotes: !!orderOptions.notes
  });

  try {
    // Create order using Razorpay SDK
    const order = await razorpay.orders.create(orderOptions);
    
    console.log("✅ Razorpay order created:", order.id);
    return order;
  } catch (err: any) {
    console.error("❌ Razorpay SDK error:", {
      error: err,
      message: err?.message,
      description: err?.error?.description,
      code: err?.error?.code,
      field: err?.error?.field
    });
    
    const errorMsg = err?.error?.description || 
                    err?.error?.message || 
                    err?.message ||
                    "Failed to create Razorpay order";
    throw new Error(errorMsg);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return j(res, { ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // In Vercel Node.js runtime, body is already parsed and available as req.body
    const payload = req.body || {};
    
    const {
      amount,
      receipt,
      notes,
    } = payload;

    console.log("💳 Razorpay order request:", { amount, receipt });

    if (!amount || Number(amount) <= 0) {
      return j(res, { ok: false, error: "Amount must be > 0" }, 400);
    }

    if (!receipt) {
      return j(res, { ok: false, error: "Receipt ID is required" }, 400);
    }

    const order = await createRazorpayOrder(Number(amount), receipt, notes);

    return j(res, {
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
    return j(res, { 
      ok: false, 
      error: errorMessage,
      // Include error type for debugging (remove in production if needed)
      type: err?.name || "UnknownError"
    }, 500);
  }
}

