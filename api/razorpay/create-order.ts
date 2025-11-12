// Using Node.js runtime instead of Edge to avoid 406 issues with Razorpay API
// export const config = { runtime: "edge" };

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

// Environment variable getter (works in both Edge and Node.js)
function getEnv(name: string): string | undefined {
  // Try Node.js process.env first (for Node.js runtime)
  if (typeof process !== "undefined" && process.env) {
    const value = (process.env as any)[name];
    if (value) return value;
  }
  // Fallback to Deno env (for Edge runtime)
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
  
  // Validate amount and ensure it's an integer
  const amountInPaise = Math.round(Number(amount) * 100);
  if (amountInPaise < 100) {
    throw new Error("Amount must be at least ₹1.00 (100 paise)");
  }
  if (!Number.isInteger(amountInPaise)) {
    throw new Error("Amount must be a valid number");
  }

  // Build order data according to Razorpay API spec
  // Keep it minimal - only required fields first
  // Razorpay is very strict about data types
  const orderData: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  } = {
    amount: amountInPaise, // Must be integer in paise
    currency: "INR",
    receipt: receipt.substring(0, 40).trim(), // Razorpay has 40 char limit, remove whitespace
  };
  
  // Only include notes if it has content and is a valid object
  // Some Razorpay endpoints reject empty notes objects
  if (notes && typeof notes === 'object' && Object.keys(notes).length > 0) {
    // Validate notes - each value must be string and max 256 chars
    const validNotes: Record<string, string> = {};
    for (const [key, value] of Object.entries(notes)) {
      if (key && value && typeof value === 'string' && value.length <= 256) {
        validNotes[key] = value;
      }
    }
    if (Object.keys(validNotes).length > 0) {
      orderData.notes = validNotes;
    }
  }

  console.log("📤 Creating Razorpay order:", { 
    amount: orderData.amount, 
    receipt: orderData.receipt, 
    currency: orderData.currency,
    keyIdPrefix: keyId?.substring(0, 10) + "...",
    hasNotes: !!notes && Object.keys(notes).length > 0
  });

  // Basic auth: keyId:keySecret
  // Edge Runtime has btoa available
  // Trim to ensure no whitespace issues
  const credentials = `${keyId.trim()}:${keySecret.trim()}`;
  let auth: string;
  
  try {
    auth = btoa(credentials);
  } catch (e) {
    console.error("❌ Base64 encoding failed:", e);
    throw new Error("Failed to encode credentials");
  }
  
  // Verify auth was created correctly
  // Expected: cnpwX3Rlc3RfUmV2SXVvOGQ4TUtzYXU6eEszV0haV0JIZVk0Nnh2YVdQbkZhMHR5 (64 chars)
  if (!auth || auth.length < 10) {
    throw new Error("Failed to create authentication token");
  }
  
  console.log("🔐 Auth encoding check:", {
    keyIdLength: keyId.length,
    keySecretLength: keySecret.length,
    authLength: auth.length,
    authMatchesExpected: auth === "cnpwX3Rlc3RfUmV2SXVvOGQ4TUtzYXU6eEszV0haV0JIZVk0Nnh2YVdQbkZhMHR5"
  });
  
  // Log request details (without sensitive data)
  console.log("📋 Request details:", {
    url: "https://api.razorpay.com/v1/orders",
    method: "POST",
    hasAuth: !!auth,
    authLength: auth.length,
    bodySize: JSON.stringify(orderData).length,
    bodyPreview: JSON.stringify(orderData).substring(0, 100)
  });

  let response: Response;
  let responseText: string;
  
  try {
    // Razorpay API - match the exact format that works with curl
    const requestBody = JSON.stringify(orderData);
    
    console.log("🔍 Final request body:", requestBody);
    console.log("🔍 Auth header length:", auth.length);
    
    // Create headers object - minimal set that Razorpay accepts
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
    };
    
    // Try with Accept header first (as per Razorpay docs)
    headers["Accept"] = "application/json";
    
    console.log("🔍 Making request with headers:", Object.keys(headers));
    
    response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: headers,
      body: requestBody,
    });

    responseText = await response.text();
    
    // If we get 406, try without notes as a diagnostic
    if (response.status === 406 && orderData.notes) {
      console.log("⚠️ Got 406 with notes, trying without notes...");
      const orderDataWithoutNotes = {
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
      };
      
      const retryResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify(orderDataWithoutNotes),
      });
      
      const retryText = await retryResponse.text();
      console.log("🔄 Retry response:", {
        status: retryResponse.status,
        body: retryText.substring(0, 200)
      });
      
      // If retry works, use that response
      if (retryResponse.ok) {
        response = retryResponse;
        responseText = retryText;
      }
    }
  } catch (fetchErr: any) {
    console.error("❌ Network error calling Razorpay:", fetchErr);
    throw new Error(`Network error: ${fetchErr?.message || "Failed to connect to Razorpay"}`);
  }

  // Log the raw response for debugging
  console.log("📥 Razorpay response:", {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    bodyLength: responseText.length,
    bodyPreview: responseText.substring(0, 200)
  });

  let data: any = {};
  
  // Try to parse as JSON, but handle non-JSON responses
  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("❌ Failed to parse Razorpay response as JSON:", {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText
      });
      
      // If it's not JSON, include the raw text in the error
      throw new Error(`Invalid response from Razorpay (Status: ${response.status}): ${responseText.substring(0, 500)}`);
    }
  } else {
    // Empty response
    console.error("❌ Empty response from Razorpay:", {
      status: response.status,
      statusText: response.statusText
    });
    throw new Error(`Empty response from Razorpay (Status: ${response.status})`);
  }

  if (!response.ok) {
    console.error("❌ Razorpay order creation failed:", {
      status: response.status,
      statusText: response.statusText,
      error: data,
      fullResponse: responseText
    });
    
    // Provide more detailed error message
    const errorMsg = data.error?.description || 
                    data.error?.message || 
                    data.error?.code ||
                    data.description ||
                    data.message ||
                    `Razorpay API error (Status: ${response.status}${response.statusText ? `: ${response.statusText}` : ''})`;
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
    // Handle request body parsing for Node.js runtime
    let payload: any = {};
    try {
      if (req.body) {
        // Node.js runtime - body might be a stream or already parsed
        if (typeof req.body === 'string') {
          payload = JSON.parse(req.body);
        } else if (req.body instanceof ReadableStream) {
          const reader = req.body.getReader();
          const chunks: Uint8Array[] = [];
          let done = false;
          while (!done) {
            const { value, done: streamDone } = await reader.read();
            done = streamDone;
            if (value) chunks.push(value);
          }
          const bodyText = new TextDecoder().decode(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));
          payload = JSON.parse(bodyText);
        } else {
          payload = req.body;
        }
      } else {
        // Try req.json() for Edge runtime compatibility
        if (typeof (req as any).json === 'function') {
          payload = await (req as any).json();
        } else {
          // Fallback: read as text and parse
          const text = await req.text();
          if (text) payload = JSON.parse(text);
        }
      }
    } catch (parseErr) {
      console.error("❌ Failed to parse request body:", parseErr);
      payload = {};
    }
    
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

