// api/phonepe/pay.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const BASE_URL   = process.env.PHONEPE_BASE_URL!;
const MERCHANT_ID= process.env.PHONEPE_MERCHANT_ID!;
const SALT_KEY   = process.env.PHONEPE_SALT_KEY!;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX!;
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL!; // e.g. https://admin.cuephoria.in

// X-VERIFY for /pg/v1/pay → SHA256(base64Payload + path + saltKey) + "###" + saltIndex
function buildChecksum(base64Payload: string, path: string) {
  const toSign = base64Payload + path + SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(toSign).digest('hex');
  return `${sha256}###${SALT_INDEX}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { amount, customerPhone, customerName, merchantTransactionId } = req.body || {};
    if (!amount || !merchantTransactionId) {
      return res.status(400).json({ error: 'Missing amount or merchantTransactionId' });
    }

    // PhonePe expects amount in paise (integer)
    const amountPaise = Math.round(Number(amount) * 100);

    // After payment, PhonePe will redirect the user here:
    // NOTE: we use /public/payment/success so it matches your /public/* URL space
    const redirectUrl = `${SITE_URL}/public/payment/success?txn=${encodeURIComponent(merchantTransactionId)}`;
    const callbackUrl = redirectUrl; // optional separate webhook can be added later

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: customerPhone || 'guest',
      amount: amountPaise,
      redirectUrl,
      redirectMode: 'POST',
      callbackUrl,
      mobileNumber: customerPhone || undefined,
      paymentInstrument: { type: 'PAY_PAGE' },
      message: `Booking by ${customerName || 'Guest'}`,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const path = '/pg/v1/pay';
    const checksum = buildChecksum(payloadBase64, path);

    const resp = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': MERCHANT_ID,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const data = await resp.json();
    if (!resp.ok || data?.success === false) {
      return res.status(400).json({ error: data?.code || 'PHONEPE_CREATE_FAILED', details: data });
    }

    const redirectUrlFromPhonePe = data?.data?.instrumentResponse?.redirectInfo?.url;
    if (!redirectUrlFromPhonePe) {
      return res.status(400).json({ error: 'MISSING_REDIRECT_URL', details: data });
    }

    res.status(200).json({ url: redirectUrlFromPhonePe });
  } catch (e) {
    console.error('PhonePe pay error:', e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
