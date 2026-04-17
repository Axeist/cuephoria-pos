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
