// api/phonepe/pay.ts
export const runtime = 'edge';

type PayBody = {
  amount: number; // INR (rupees)
  customerPhone?: string;
  merchantTransactionId: string;
  successUrl: string;
  failedUrl: string;
};

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST(req: Request) {
  try {
    const {
      amount,
      customerPhone,
      merchantTransactionId,
      successUrl,
      failedUrl,
    } = (await req.json()) as PayBody;

    // ---- STEP 0: Validate body
    if (!amount || amount <= 0) {
      return json(400, {
        ok: false,
        step: 'validate',
        error: 'Amount must be a positive integer (rupees).',
      });
    }
    if (!merchantTransactionId) {
      return json(400, {
        ok: false,
        step: 'validate',
        error: 'merchantTransactionId is required.',
      });
    }
    if (!successUrl || !failedUrl) {
      return json(400, {
        ok: false,
        step: 'validate',
        error: 'successUrl and failedUrl are required (https URLs).',
      });
    }

    // ---- STEP 1: Read env
    let BASE = '', CLIENT_ID = '', CLIENT_VERSION = '', CLIENT_SECRET = '';
    try {
      BASE = env('PHONEPE_BASE_URL');               // e.g. https://api-preprod.phonepe.com/apis/pg-sandbox
      CLIENT_ID = env('PHONEPE_CLIENT_ID');         // TEST-... (from screenshot)
      CLIENT_VERSION = env('PHONEPE_CLIENT_VERSION'); // "1"
      CLIENT_SECRET = env('PHONEPE_CLIENT_SECRET'); // long secret (from screenshot)
    } catch (e: any) {
      return json(500, { ok: false, step: 'env', error: e.message });
    }

    // ---- STEP 2: OAuth token
    try {
      const authRes = await fetch(`${BASE}/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': CLIENT_ID,
          'x-client-version': CLIENT_VERSION,
          'x-client-secret': CLIENT_SECRET,
        },
        body: JSON.stringify({}), // body is empty per docs
      });

      const authText = await authRes.text();
      let auth: any = null;
      try { auth = JSON.parse(authText); } catch { /* ignore */ }

      if (!authRes.ok || !auth?.accessToken) {
        return json(authRes.status || 500, {
          ok: false,
          step: 'oauth',
          status: authRes.status,
          error:
            auth?.error ||
            auth?.message ||
            (typeof authText === 'string' ? authText : 'OAuth failed'),
          raw: auth ?? authText,
        });
      }

      const accessToken = auth.accessToken as string;

      // ---- STEP 3: Create Payment (amount in *paise*)
      const paise = Math.round(amount * 100);

      const createRes = await fetch(`${BASE}/checkout/v2/pay`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          merchantTransactionId,
          amount: paise,
          redirectUrl: successUrl,
          redirectMode: 'REDIRECT',
          failureRedirectUrl: failedUrl,
          paymentInstrument: {
            type: 'PAY_PAGE',
          },
          ...(customerPhone ? { mobileNumber: customerPhone } : {}),
        }),
      });

      const createText = await createRes.text();
      let create: any = null;
      try { create = JSON.parse(createText); } catch { /* ignore */ }

      if (!createRes.ok || !(create?.redirectUrl || create?.url || create?.instrumentResponse?.redirectInfo?.url)) {
        return json(createRes.status || 500, {
          ok: false,
          step: 'create-payment',
          status: createRes.status,
          error:
            create?.error ||
            create?.message ||
            (typeof createText === 'string' ? createText : 'Create payment failed'),
          raw: create ?? createText,
        });
      }

      const redirectUrl =
        create.redirectUrl ||
        create.url ||
        create.instrumentResponse?.redirectInfo?.url;

      return json(200, { ok: true, url: redirectUrl, raw: create });
    } catch (e: any) {
      // Catch-all for network/parse errors
      return json(500, {
        ok: false,
        step: 'exception',
        error: e?.message || String(e),
      });
    }
  } catch (e: any) {
    return json(400, { ok: false, step: 'bad-request', error: e?.message || String(e) });
  }
}
