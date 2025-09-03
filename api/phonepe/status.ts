import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../src/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { txn } = req.query;
  if (!txn || typeof txn !== 'string') {
    return res.status(400).json({ ok: false, error: 'Transaction ID is required' });
  }

  try {
    console.log('🔍 Checking payment status for transaction:', txn);

    // Query payment status from database
    const { data, error } = await supabase
      .from('payments')
      .select('status, amount, created_at')
      .eq('transaction_id', txn)
      .single();

    if (error) {
      console.error('Database query error:', error);
      return res.status(404).json({ ok: false, error: 'Transaction not found' });
    }

    const state = data?.status || 'UNKNOWN';
    
    res.status(200).json({ 
      ok: true, 
      state,
      amount: data.amount,
      created_at: data.created_at
    });
  } catch (error) {
    console.error('❌ Payment status check error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get payment status' });
  }
}
