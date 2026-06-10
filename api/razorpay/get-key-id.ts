import { parseRazorpayProfile, resolveRazorpayKeyIdOnly } from "./credentials.js";

export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return j({}, 200);
  if (req.method !== "GET") return j({ ok: false, error: "Method not allowed" }, 405);

  try {
    const url = new URL(req.url);
    const profile = parseRazorpayProfile(url.searchParams.get("profile"));
    const locationId = (url.searchParams.get("location") || "").trim() || undefined;
    const keyId = await resolveRazorpayKeyIdOnly({ locationId, profile });
    return j({ ok: true, keyId });
  } catch (err: any) {
    const message = String(err?.message || err);
    const status = message.includes("Razorpay account is not ready") ? 503 : 500;
    return j({ ok: false, error: message }, status);
  }
}
