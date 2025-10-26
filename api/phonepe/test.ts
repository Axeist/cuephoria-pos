export const config = { runtime: "edge" };

function j(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
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

export default async function handler(req: Request) {
  if (req.method !== "GET") {
    return j({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    console.log("🧪 PhonePe Test Endpoint Called");
    
    // Check if all required environment variables are present
    const envVars = {
      PHONEPE_BASE_URL: process.env.PHONEPE_BASE_URL || (globalThis as any)?.Deno?.env?.get?.("PHONEPE_BASE_URL"),
      PHONEPE_AUTH_BASE: process.env.PHONEPE_AUTH_BASE || (globalThis as any)?.Deno?.env?.get?.("PHONEPE_AUTH_BASE"),
      PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID || (globalThis as any)?.Deno?.env?.get?.("PHONEPE_MERCHANT_ID"),
      PHONEPE_CLIENT_ID: process.env.PHONEPE_CLIENT_ID || (globalThis as any)?.Deno?.env?.get?.("PHONEPE_CLIENT_ID"),
      PHONEPE_CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET || (globalThis as any)?.Deno?.env?.get?.("PHONEPE_CLIENT_SECRET"),
      PHONEPE_CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION || (globalThis as any)?.Deno?.env?.get?.("PHONEPE_CLIENT_VERSION"),
    };

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      return j({
        ok: false,
        error: "Missing environment variables",
        missing: missingVars,
        available: Object.keys(envVars).filter(key => envVars[key as keyof typeof envVars])
      }, 400);
    }

    // Test OAuth token generation
    try {
      const AUTH_BASE = envVars.PHONEPE_AUTH_BASE;
      const CLIENT_ID = envVars.PHONEPE_CLIENT_ID;
      const CLIENT_SECRET = envVars.PHONEPE_CLIENT_SECRET;
      const CLIENT_VERSION = envVars.PHONEPE_CLIENT_VERSION;

      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_version: CLIENT_VERSION,
      });

      console.log("🔑 Testing OAuth token generation");
      const oauthResponse = await fetch(`${AUTH_BASE}/v1/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });

      const oauthText = await oauthResponse.text();
      let oauthData: any = {};
      try { 
        oauthData = JSON.parse(oauthText); 
      } catch {}

      if (!oauthResponse.ok) {
        return j({
          ok: false,
          error: "OAuth token generation failed",
          status: oauthResponse.status,
          response: oauthData,
          rawResponse: oauthText
        }, 502);
      }

      return j({
        ok: true,
        message: "PhonePe configuration is working",
        envVars: {
          PHONEPE_BASE_URL: envVars.PHONEPE_BASE_URL,
          PHONEPE_AUTH_BASE: envVars.PHONEPE_AUTH_BASE,
          PHONEPE_MERCHANT_ID: envVars.PHONEPE_MERCHANT_ID,
          PHONEPE_CLIENT_ID: envVars.PHONEPE_CLIENT_ID,
          // Don't expose secret
          PHONEPE_CLIENT_SECRET: "***",
          PHONEPE_CLIENT_VERSION: envVars.PHONEPE_CLIENT_VERSION,
        },
        oauthTest: {
          success: true,
          tokenType: oauthData?.token_type,
          hasAccessToken: !!oauthData?.access_token,
          hasEncryptedToken: !!oauthData?.encrypted_access_token
        }
      });

    } catch (oauthError: any) {
      return j({
        ok: false,
        error: "OAuth test failed",
        details: oauthError.message,
        envVars: {
          PHONEPE_BASE_URL: envVars.PHONEPE_BASE_URL,
          PHONEPE_AUTH_BASE: envVars.PHONEPE_AUTH_BASE,
          PHONEPE_MERCHANT_ID: envVars.PHONEPE_MERCHANT_ID,
          PHONEPE_CLIENT_ID: envVars.PHONEPE_CLIENT_ID,
          PHONEPE_CLIENT_VERSION: envVars.PHONEPE_CLIENT_VERSION,
        }
      }, 502);
    }

  } catch (error: any) {
    console.error("💥 Test endpoint error:", error);
    return j({ 
      ok: false, 
      error: "Test failed", 
      details: error.message 
    }, 500);
  }
}
