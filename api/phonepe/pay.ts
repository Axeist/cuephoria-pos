// /api/phonepe/pay.ts
// Vercel Serverless Function (Node/ESM) — PhonePe Standard Checkout: Create Payment
// Accepts POST JSON:
// {
//   "amount": 299,                        // rupees (we convert to paise)
//   "customerPhone": "9876543210",        // optional
//   "merchantTransactionId": "CUE-...",
//   "successUrl": "https://.../public/booking?pp=success",
//   "failedUrl":  "https://.../public/booking?pp=failed"
// }

import type { VercelRequest, VercelResponse } from '@vercel/node';

type Env = {
  PHONEPE_BASE_URL?: string;
  PHONEPE_MERCHANT_ID?: string;
  PHONEPE_CLIENT_ID?: string;
  PHONEPE_CLIENT_VERSION?: string;
  PHONEPE_CLIENT_SECRET?: string;
};

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function need(env: Env, k: keyof Env): string {
  const v = env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
}

async function getBearerToken(env: Env) {
  const BASE = need(env, 'PHONEPE_BASE_URL');
  const CID  = need(env, 'PHONEPE_CLIENT_ID');
  const CVER = need(env, 'PHONEPE_CLIENT_VERSION');
  const CSEC = need(env, 'PHONEPE_CLIENT_SECRET');

  const url = `${BASE}/v1/oauth/token`;

  const form = new URLSearchParams();
  form.set('grant_type', 'CLIENT_CREDENTIALS');
  form.set('client_id', CID);
  form.set('client_secret', CSEC);
  form.set('client_version', CVER);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json',
    },
    body: form.toString(),
  });

  const raw = await res.text();
  let json: any = null;
  try { json = JSON.parse(raw); } catch {}

  if (!res.ok) {
    throw new Error(`Auth failed [${res.status}]. ${json?.error || json?.message || raw}`);
  }

  // UAT returns `access_token` (snake_case)
  const token =
    json?.access_token ||
    json?.accessToken ||
    json?.data?.accessToken ||
    json?.response?.accessToken;

  if (!token) throw new Error(`Auth OK but no accessToken in response: ${raw}`);
  return token as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-origin', corsHeaders['access-control-allow-origin']);
      res.setHeader('access-control-allow-methods', corsHeaders['access-control-allow-methods']);
      res.setHeader('access-control-allow-headers', corsHeaders['access-control-allow-headers']);
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('access-control-allow-origin', '*');
      res.status(405).json({ ok: false, error: 'Method not allowed' });
      return;
    }

    const env: Env = {
      PHONEPE_BASE_URL: process.env.PHONEPE_BASE_URL,
      PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
      PHONEPE_CLIENT_ID: process.env.PHONEPE_CLIENT_ID,
      PHONEPE_CLIENT_VERSION: process.env.PHONEPE_CLIENT_VERSION,
      PHONEPE_CLIENT_SECRET: process.env.PHONEPE_CLIENT_SECRET,
    };

    // Validate env (throws if missing)
    const BASE = need(env, 'PHONEPE_BASE_URL');
    const MID  = need(env, 'PHONEPE_MERCHANT_ID');

    const body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body || {};
    const amountRupees = Number(body?.amount ?? 0);
    const customerPhone = String(body?.customerPhone ?? '');
    const merchantTransactionId = String(body?.merchantTransactionId ?? '');
    const successUrl = String(body?.successUrl ?? '');
    const failedUrl  = String(body?.failedUrl ?? '');

    if (!merchantTransactionId) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(400).json({ ok: false, error: 'Missing merchantTransactionId' });
      return;
    }
    if (!amountRupees || amountRupees <= 0) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(400).json({ ok: false, error: 'Invalid amount' });
      return;
    }
    if (!successUrl || !failedUrl) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(400).json({ ok: false, error: 'Missing successUrl/failedUrl' });
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);

    // 1) OAuth Bearer
    const bearer = await getBearerToken(env);

    // 2) Create Payment
    const url = `${BASE}/checkout/v2/pay`;

    const payload: any = {
      merchantId: MID,
      merchantTransactionId,
      amount: amountPaise,
      instrumentType: 'PAY_PAGE',
      redirectUrl: successUrl,      // PhonePe will redirect here on completion
      redirectMode: 'GET',
      meta: {
        consumerMobileNumber: customerPhone || undefined,
        merchantOrderId: merchantTransactionId, // keep identical in UAT
      },
    };

    const payRes = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Bearer ${bearer}`,
      },
      body: JSON.stringify(payload),
    });

    const payRaw = await payRes.text();
    let payJson: any = null;
    try { payJson = JSON.parse(payRaw); } catch {}

    if (!payRes.ok) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(502).json({ ok: false, error: 'PhonePe pay failed', status: payRes.status, raw: payRaw, step: 'pay' });
      return;
    }

    const redirectUrl =
      payJson?.data?.instrumentResponse?.redirectInfo?.url ||
      payJson?.instrumentResponse?.redirectInfo?.url ||
      payJson?.redirectInfo?.url ||
      payJson?.data?.url ||
      payJson?.url;

    if (!redirectUrl) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(502).json({ ok: false, error: 'No redirect URL in PhonePe response', raw: payJson, step: 'pay' });
      return;
    }

    res.setHeader('access-control-allow-origin', '*');
    res.status(200).json({ ok: true, url: redirectUrl, step: 'pay' });
  } catch (err: any) {
    res.setHeader('access-control-allow-origin', '*');
    res.status(500).json({ ok: false, error: `Could not start PhonePe payment (exception). ${err?.message || err}` });
  }
}
