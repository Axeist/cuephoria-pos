// /api/phonepe/status.ts
// Vercel Serverless Function (Node/ESM) — PhonePe: Order/Transaction Status
// GET params:
//   ?merchantOrderId=...    OR    ?merchantTransactionId=...

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
  'access-control-allow-methods': 'GET,OPTIONS',
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

    if (req.method !== 'GET') {
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

    const BASE = need(env, 'PHONEPE_BASE_URL');
    const MID  = need(env, 'PHONEPE_MERCHANT_ID');

    const merchantOrderId = String(req.query?.merchantOrderId ?? '');
    const merchantTransactionId = String(req.query?.merchantTransactionId ?? '');

    if (!merchantOrderId && !merchantTransactionId) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(400).json({ ok: false, error: 'Missing query param: merchantOrderId (or merchantTransactionId)' });
      return;
    }

    const bearer = await getBearerToken(env);

    let url = '';
    if (merchantOrderId) {
      url = `${BASE}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status`;
    } else {
      // fallback for UAT by transaction id
      url = `${BASE}/checkout/v2/merchant-transaction/${encodeURIComponent(merchantTransactionId)}`;
    }

    const out = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${bearer}`,
        'x-merchant-id': MID,
      },
    });

    const raw = await out.text();
    let json: any = null;
    try { json = JSON.parse(raw); } catch {}

    if (!out.ok) {
      res.setHeader('access-control-allow-origin', '*');
      res.status(502).json({ ok: false, error: 'PhonePe status failed', status: out.status, raw });
      return;
    }

    res.setHeader('access-control-allow-origin', '*');
    res.status(200).json({ ok: true, status: json });
  } catch (err: any) {
    res.setHeader('access-control-allow-origin', '*');
    res.status(500).json({ ok: false, error: `Could not fetch PhonePe status (exception). ${err?.message || err}` });
  }
}
