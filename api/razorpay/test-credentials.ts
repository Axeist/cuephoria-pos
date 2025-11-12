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
function getEnv(name: string): string | undefined {
  const fromDeno = (globalThis as any)?.Deno?.env?.get?.(name);
  const fromProcess = typeof process !== "undefined" ? (process.env as any)?.[name] : undefined;
  return fromDeno ?? fromProcess;
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return j({}, 200);
  }

  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const mode = getEnv("RAZORPAY_MODE") || "test";
    const keyId = getEnv("RAZORPAY_KEY_ID_TEST") || getEnv("RAZORPAY_KEY_ID");
    const keySecret = getEnv("RAZORPAY_KEY_SECRET_TEST") || getEnv("RAZORPAY_KEY_SECRET");

    // Test creating a minimal order
    const auth = btoa(`${keyId}:${keySecret}`);
    
    const testOrder = {
      amount: 100, // 1 rupee in paise
      currency: "INR",
      receipt: `TEST-${Date.now()}`,
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify(testOrder),
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {}

    return j({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      mode,
      hasKeyId: !!keyId,
      keyIdPrefix: keyId?.substring(0, 15) + "...",
      hasKeySecret: !!keySecret,
      authLength: auth.length,
      response: data,
      rawResponse: responseText.substring(0, 500),
    });
  } catch (err: any) {
    return j({ 
      ok: false, 
      error: String(err?.message || err) 
    }, 500);
  }
}

