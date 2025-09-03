import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { supabase } from '../../src/integrations/supabase/client';

// IMPORTANT: Disable body parser to read raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('📥 PhonePe webhook received:', {
      method: req.method,
      timestamp: new Date().toISOString(),
      url: req.url
    });

    console.log('🔐 Headers:', req.headers);
    console.log('🔐 Authorization header:', req.headers.authorization);

    // Validate authorization header (optional but recommended)
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.PHONEPE_WEBHOOK_SECRET;
    
    if (expectedAuth && authHeader !== expectedAuth) {
      console.error('❌ Unauthorized webhook call');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get raw body using buffer from micro
    const rawBody = await buffer(req);
    const bodyText = rawBody.toString('utf8');
    
    console.log('📦 Raw body:', bodyText);

    // Parse JSON from raw body
    const webhookData = JSON.parse(bodyText);
    console.log('🎯 Parsed webhook data:', webhookData);

    // TODO: Process webhook data based on PhonePe's webhook structure
    // Example webhook processing:
    /*
    if (webhookData.event === 'checkout.order.completed') {
      const transactionId = webhookData.payload.merchantTransactionId;
      const status = webhookData.payload.state; // SUCCESS, FAILED, etc.
      
      // Update payment status in database
      const { error } = await supabase
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('transaction_id', transactionId);
      
      if (error) {
        console.error('Failed to update payment status:', error);
      }
    }
    */

    res.status(200).json({ success: true, received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
