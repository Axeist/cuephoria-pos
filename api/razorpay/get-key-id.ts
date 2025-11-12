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

// Edge-safe env getter
function need(name: string) {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  const v = fromDeno ?? fromProcess;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Get Razorpay Key ID (public key, safe to expose)
function getRazorpayKeyId() {
  const mode = need("RAZORPAY_MODE") || "test";
  const isLive = mode === "live";
  
  return isLive 
    ? (need("RAZORPAY_KEY_ID_LIVE") || need("RAZORPAY_KEY_ID"))
    : (need("RAZORPAY_KEY_ID_TEST") || need("RAZORPAY_KEY_ID"));
}

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return j({}, 200);
  }

  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const keyId = getRazorpayKeyId();
    return j({
      ok: true,
      keyId,
    });
  } catch (err: any) {
    console.error("💥 Get key ID error:", err);
    return j({ 
      ok: false, 
      error: String(err?.message || err) 
    }, 500);
  }
}

