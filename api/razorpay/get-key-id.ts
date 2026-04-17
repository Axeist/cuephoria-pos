import { getRazorpayKeyId as resolveKeyId, parseRazorpayProfile } from "./credentials";

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
    const keyId = resolveKeyId(profile);
    return j({ ok: true, keyId });
  } catch (err: any) {
    return j({ ok: false, error: String(err?.message || err) }, 500);
  }
}
