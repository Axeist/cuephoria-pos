/**
 * Lazy billing add-on: Razorpay token → card/UPI hint for the tenant billing UI.
 *
 * Kept separate from GET /api/tenant/billing so the main billing payload stays
 * fast enough to beat platform gateway timeouts (~60s) when RzP stalls.
 */

import { j } from "../../src/server/adminApiUtils.js";
import { withOrgContext, type OrgContext } from "../../src/server/orgContext.js";
import {
  getPaymentInstrumentForCustomer,
  getRazorpayClient,
} from "../../src/server/lib/razorpay-subscriptions.js";

export const config = { maxDuration: 25 };

const LOOKUP_DEADLINE_MS = 10_000;

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(`Razorpay call timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (t !== undefined) clearTimeout(t);
  });
}

async function handler(req: Request, ctx: OrgContext): Promise<Response> {
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  const { data: sub, error } = await ctx.supabase
    .from("subscriptions")
    .select("status, razorpay_customer_id, razorpay_subscription_id")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return j({ ok: false, error: error.message }, 500);

  const wants =
    sub?.razorpay_customer_id &&
    sub?.razorpay_subscription_id &&
    !ctx.isInternal &&
    (sub.status === "active" || sub.status === "trialing");

  if (!wants) {
    return j({ ok: true, paymentInstrument: { kind: "none" } }, 200);
  }

  try {
    const client = await getRazorpayClient();
    const paymentInstrument = await raceTimeout(
      getPaymentInstrumentForCustomer(client, sub.razorpay_customer_id),
      LOOKUP_DEADLINE_MS,
    );
    return j({ ok: true, paymentInstrument }, 200);
  } catch {
    return j({ ok: true, paymentInstrument: { kind: "none" } }, 200);
  }
}

export default withOrgContext(handler);
