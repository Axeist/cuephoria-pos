// Using Node.js runtime to use Razorpay SDK
// export const config = { runtime: "edge" };

import {
  getRazorpayCredentials,
  parseRazorpayProfile,
  type RazorpayProfile,
} from "../lib/razorpay-credentials";
import {
  getDefaultCheckoutCurrency,
  parseCurrency,
  toMinorUnits,
} from "../lib/payment-provider";
import { assertProviderEnabledNow, resolveRequestedProvider } from "../lib/payment-provider-facade";

// Increase timeout to 30 seconds to handle Razorpay API calls
export const config = {
  maxDuration: 30, // 30 seconds (default is 10s, max is 60s for Pro plan)
};

// Vercel Node.js runtime types
type VercelRequest = {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
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

// Create Razorpay order using Razorpay SDK (Node.js runtime)
async function createRazorpayOrder(
  amount: number,
  currency: string,
  receipt: string,
  notes: Record<string, string> | undefined,
  profile: RazorpayProfile
) {
  // Import Razorpay SDK
  const Razorpay = (await import('razorpay')).default;
  
  let keyId: string;
  let keySecret: string;
  
  try {
    const credentials = getRazorpayCredentials(profile);
    keyId = credentials.keyId;
    keySecret = credentials.keySecret;
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("❌ Failed to get Razorpay credentials:", err);
    throw new Error(`Configuration error: ${error?.message || "Missing Razorpay credentials"}`);
  }
  
  const normalizedCurrency = parseCurrency(currency, getDefaultCheckoutCurrency());
  const amountInMinor = toMinorUnits(Number(amount), normalizedCurrency);
  if (amountInMinor < 1) {
    throw new Error("Amount must be at least 1 minor unit");
  }
  if (!Number.isInteger(amountInMinor)) {
    throw new Error("Amount must be a valid number");
  }

  // Initialize Razorpay client
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  // Build order options
  const orderOptions: Record<string, unknown> = {
    amount: amountInMinor, // Amount in minor units
    currency: normalizedCurrency,
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
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      error?: { description?: string; message?: string; code?: string; field?: string };
    };
    console.error("❌ Razorpay SDK error:", {
      error: err,
      message: error?.message,
      description: error?.error?.description,
      code: error?.error?.code,
      field: error?.error?.field
    });
    
    const errorMsg = error?.error?.description || 
                    error?.error?.message || 
                    error?.message ||
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
      currency: currencyRaw,
      receipt,
      notes,
      profile: profileRaw,
      provider: providerRaw,
    } = payload;

    const profile = parseRazorpayProfile(profileRaw);
    const provider = resolveRequestedProvider(providerRaw);
    assertProviderEnabledNow(provider, "order creation");
    const currency = parseCurrency(currencyRaw, getDefaultCheckoutCurrency());

    console.log("💳 Razorpay order request:", { amount, currency, receipt, profile, provider });

    if (!amount || Number(amount) <= 0) {
      return j(res, { ok: false, error: "Amount must be > 0" }, 400);
    }

    if (!receipt) {
      return j(res, { ok: false, error: "Receipt ID is required" }, 400);
    }

    const order = await createRazorpayOrder(
      Number(amount),
      currency,
      String(receipt),
      (notes as Record<string, string> | undefined) ?? undefined,
      profile,
    );

    return j(res, {
      ok: true,
      provider,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; stack?: string; name?: string };
    console.error("💥 Razorpay order error:", {
      message: error?.message,
      stack: error?.stack,
      error: err
    });
    
    // Return detailed error for debugging
    const errorMessage = error?.message || String(err);
    const status = String(error?.message || "").includes("not enabled yet") ? 501 : 500;
    return j(res, { 
      ok: false, 
      error: errorMessage,
      // Include error type for debugging (remove in production if needed)
      type: error?.name || "UnknownError"
    }, status);
  }
}

