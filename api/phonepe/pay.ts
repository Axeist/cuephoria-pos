import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, customerPhone, merchantTransactionId } = req.body;

  if (!amount || !customerPhone || !merchantTransactionId) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  try {
    console.log('🚀 Initiating PhonePe payment:', { amount, customerPhone, merchantTransactionId });

    // TODO: Implement actual PhonePe payment initiation
    // This is a placeholder - replace with actual PhonePe API integration
    
    // For now, return a mock payment URL
    const paymentUrl = `https://sandbox-phonepe-gateway.com/checkout?txnId=${merchantTransactionId}&amount=${amount}`;
    
    // You would typically also store payment record in database here
    const { error } = await supabase
      .from('payments')
      .insert({
        transaction_id: merchantTransactionId,
        amount: amount,
        customer_phone: customerPhone,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to store payment record:', error);
    }

    res.status(200).json({ ok: true, url: paymentUrl });
  } catch (error) {
    console.error('💥 Payment initiation error:', error);
    res.status(500).json({ ok: false, error: 'Payment initiation failed' });
  }
}
