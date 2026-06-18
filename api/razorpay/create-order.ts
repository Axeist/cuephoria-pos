import {
  getRazorpayCredentials,
  parseRazorpayProfile,
  type RazorpayProfile,
} from "./credentials.js";

export const config = {
  maxDuration: 30,
};

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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

function j(res: VercelResponse, data: unknown, status = 200) {
  setCorsHeaders(res);
  res.status(status).json(data);
}

async function createRazorpayOrder(
  amount: number,
  receipt: string,
  notes: Record<string, string> | undefined,
  profile: RazorpayProfile,
) {
  const Razorpay = (await import("razorpay")).default;
  const { keyId, keySecret } = getRazorpayCredentials(profile);

  const amountInPaise = Math.round(Number(amount) * 100);
  if (amountInPaise < 100) throw new Error("Amount must be at least ₹1.00 (100 paise)");
  if (!Number.isInteger(amountInPaise)) throw new Error("Amount must be a valid number");

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const orderOptions: any = {
    amount: amountInPaise,
    currency: "INR",
    receipt: receipt.substring(0, 40).trim(),
  };

  if (notes && typeof notes === "object" && Object.keys(notes).length > 0) {
    const validNotes: Record<string, string> = {};
    for (const [key, value] of Object.entries(notes)) {
      if (key && value && typeof value === "string" && value.length <= 256) {
        validNotes[key] = value;
      }
    }
    if (Object.keys(validNotes).length > 0) orderOptions.notes = validNotes;
  }

  return razorpay.orders.create(orderOptions);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end();
  }
  if (req.method !== "POST") return j(res, { ok: false, error: "Method not allowed" }, 405);

  try {
    const payload = req.body || {};
    const { amount, receipt, notes, profile: profileRaw } = payload;
    const profile = parseRazorpayProfile(profileRaw);

    if (!amount || Number(amount) <= 0) return j(res, { ok: false, error: "Amount must be > 0" }, 400);
    if (!receipt) return j(res, { ok: false, error: "Receipt ID is required" }, 400);

    const order = await createRazorpayOrder(Number(amount), receipt, notes, profile);

    // Persist a payment_orders intent row so reconciler / webhook can
    // materialize the booking even if the customer never returns from
    // their UPI app. Best-effort — failures must not break checkout.
    try {
      const bookingPayload = (payload as { booking_payload?: unknown }).booking_payload;
      const locationIdRaw = (payload as { location_id?: unknown }).location_id;
      const customerInfo = (payload as { customer?: { name?: string; phone?: string; email?: string } }).customer;
      const kindRaw = (payload as { kind?: unknown }).kind;
      const kind = typeof kindRaw === "string" && (kindRaw === "tournament" || kindRaw === "booking") ? kindRaw : "booking";

      if (kind === "booking" && bookingPayload && typeof bookingPayload === "object") {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl =
          process.env.SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.VITE_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.SUPABASE_SERVICE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { "x-application-name": "cuephoria-create-order" } },
          });
          const amountPaise = Number(order.amount) || Math.round(Number(amount) * 100);
          const profileTag = profile === "lite" ? "lite" : "default";
          const { error: poErr } = await supabase.from("payment_orders").insert({
            provider: "razorpay",
            profile: profileTag,
            kind,
            status: "created",
            provider_order_id: order.id,
            location_id: typeof locationIdRaw === "string" && locationIdRaw.length > 0 ? locationIdRaw : null,
            customer_name: customerInfo?.name?.trim() || null,
            customer_phone: customerInfo?.phone?.trim() || null,
            customer_email: customerInfo?.email?.trim() || null,
            amount_paise: amountPaise,
            currency: order.currency,
            booking_payload: bookingPayload as Record<string, unknown>,
            notes: (notes as Record<string, unknown>) ?? null,
          });
          if (poErr) {
            console.warn("⚠️ payment_orders insert failed (legacy notes path is fallback):", poErr.message);
          }
        }
      }
    } catch (poErr) {
      console.warn("⚠️ payment_orders side-write threw (non-fatal):", (poErr as Error)?.message || poErr);
    }

    return j(res, {
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (err: any) {
    return j(res, { ok: false, error: err?.message || String(err), type: err?.name || "UnknownError" }, 500);
  }
}
