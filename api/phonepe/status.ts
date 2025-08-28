// api/phonepe/status.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const BASE_URL   = process.env.PHONEPE_BASE_URL!;
const MERCHANT_ID= process.env.PHONEPE_MERCHANT_ID!;
const SALT_KEY   = process.env.PHONEPE_SALT_KEY!;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX!;

// X-VERIFY for GET /pg/v1/status/... → SHA256(path + saltKey) + "###" + saltIndex
function buildChecksumForPath(path: string) {
  const toSign = path + SALT_KEY;
  const sha256 = crypto.createHash('sha256').update(toSign).digest('hex');
  return `${sha256}###${SALT_INDEX}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const txn = String(req.query.txn || '');
    if (!txn) return res.status(400).json({ error: 'Missing txn' });

    const path = `/pg/v1/status/${MERCHANT_ID}/${txn}`;
    const checksum = buildChecksumForPath(path);

    const resp = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': MERCHANT_ID,
      },
    });

    const data = await resp.json();
    if (!resp.ok) {
      return res.status(400).json({ error: data?.code || 'PHONEPE_STATUS_FAILED', details: data });
    }

    const success = data?.code === 'PAYMENT_SUCCESS' || data?.data?.state === 'COMPLETED';
    res.status(200).json({ success, raw: data });
  } catch (e) {
    console.error('PhonePe status error:', e);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
}
