import {
  getRazorpayCredentials,
  parseRazorpayProfile,
  type RazorpayProfile,
} from "./credentials.js";
import { PAYMENT_ORDER_PENDING_TTL_MS } from "../../src/server/lib/payment-order-ttl.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertNoConfirmedBookingOverlap,
  deleteSlotHoldsBySessionId,
  insertExclusiveCheckoutHolds,
  newCheckoutHoldSessionId,
  normalizePayloadFromBody,
  reassignHoldSessionToProviderOrderId,
  resolveLocationIdForCheckout,
} from "../../src/server/lib/checkout-slot-hold.ts";

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

function getSupabaseEnv(): { url: string; key: string } | null {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
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

    const kindRaw = (payload as { kind?: unknown }).kind;
    const kind =
      typeof kindRaw === "string" && (kindRaw === "tournament" || kindRaw === "booking") ? kindRaw : "booking";
    const bookingPayload = (payload as { booking_payload?: unknown }).booking_payload;
    const wantsBookingHold = kind === "booking" && bookingPayload && typeof bookingPayload === "object";

    let supabase: SupabaseClient | null = null;
    let holdSessionId: string | null = null;

    if (wantsBookingHold) {
      const env = getSupabaseEnv();
      if (env) {
        const { createClient } = await import("@supabase/supabase-js");
        supabase = createClient(env.url, env.key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { "x-application-name": "cuephoria-create-order" } },
        });
        const normalized = normalizePayloadFromBody(bookingPayload);
        if (
          !normalized ||
          normalized.selectedStations.length === 0 ||
          normalized.slots.length === 0 ||
          !normalized.selectedDateISO
        ) {
          return j(
            res,
            { ok: false, error: "Invalid booking_payload: need stations, slots, and date." },
            400,
          );
        }
        const profileTag: "default" | "lite" = profile === "lite" ? "lite" : "default";
        const locationId = await resolveLocationIdForCheckout(supabase, normalized.locationId, profileTag);
        if (!locationId) {
          return j(res, { ok: false, error: "Could not resolve venue for this booking." }, 500);
        }
        const overlap = await assertNoConfirmedBookingOverlap(supabase, normalized, locationId);
        if (!overlap.ok) {
          return j(res, { ok: false, conflict: true, error: overlap.message }, 409);
        }
        holdSessionId = newCheckoutHoldSessionId();
        const expiresAtIso = new Date(Date.now() + PAYMENT_ORDER_PENDING_TTL_MS).toISOString();
        const ins = await insertExclusiveCheckoutHolds(supabase, {
          locationId,
          payload: normalized,
          holdSessionId,
          expiresAtIso,
        });
        if (!ins.ok) {
          if (ins.code === "duplicate") {
            return j(res, { ok: false, conflict: true, error: ins.message }, 409);
          }
          return j(res, { ok: false, error: ins.message }, 500);
        }
      } else {
        console.warn(
          "[api/razorpay/create-order] Supabase env missing — slot hold skipped; legacy checkout only.",
        );
      }
    }

    let order;
    try {
      order = await createRazorpayOrder(Number(amount), receipt, notes, profile);
    } catch (err) {
      if (holdSessionId && supabase) {
        await deleteSlotHoldsBySessionId(supabase, holdSessionId);
      }
      throw err;
    }

    if (holdSessionId && supabase) {
      await reassignHoldSessionToProviderOrderId(supabase, holdSessionId, order.id);
    }

    try {
      if (wantsBookingHold && typeof bookingPayload === "object") {
        const env = getSupabaseEnv();
        if (env) {
          const { createClient } = await import("@supabase/supabase-js");
          const sb =
            supabase ??
            createClient(env.url, env.key, {
              auth: { persistSession: false, autoRefreshToken: false },
              global: { headers: { "x-application-name": "cuephoria-create-order" } },
            });
          const locationIdRaw = (payload as { location_id?: unknown }).location_id;
          const customerInfo = (payload as { customer?: { name?: string; phone?: string; email?: string } })
            .customer;
          const amountPaise = Number(order.amount) || Math.round(Number(amount) * 100);
          const profileTag = profile === "lite" ? "lite" : "default";
          const expiresAt = new Date(Date.now() + PAYMENT_ORDER_PENDING_TTL_MS).toISOString();
          const { error: poErr } = await sb.from("payment_orders").insert({
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
            expires_at: expiresAt,
          });
          if (poErr) {
            console.warn("⚠️ payment_orders insert failed (legacy notes path is fallback):", poErr.message);
            if (holdSessionId) {
              await deleteSlotHoldsBySessionId(sb, order.id);
            }
          }
        }
      }
    } catch (poErr) {
      console.warn("⚠️ payment_orders side-write threw (non-fatal):", (poErr as Error)?.message || poErr);
      if (holdSessionId && supabase) {
        await deleteSlotHoldsBySessionId(supabase, order.id);
      }
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
