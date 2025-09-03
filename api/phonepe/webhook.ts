import type { NextApiRequest, NextApiResponse } from 'next';
import type { Readable } from 'node:stream';

// Disable Next.js body parsing to get raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Function to read raw body
async function getRawBody(readable: Readable): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📥 PhonePe webhook received:', {
    method: req.method,
    timestamp: new Date().toISOString(),
    url: req.url,
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req);
    const bodyString = rawBody.toString('utf8');
    
    console.log('🔐 Raw body length:', rawBody.length);
    
    // Parse JSON data
    const data = JSON.parse(bodyString);
    console.log('📊 Webhook data:', data);

    // Verify PhonePe signature (implement your verification logic)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Implement your PhonePe signature verification here
    // const isValid = verifyPhonePeSignature(rawBody, authHeader);
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Process the webhook data
    await processPhonePeWebhook(data);

    // Respond quickly to avoid timeout
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}

// Your webhook processing logic
async function processPhonePeWebhook(data: any) {
  try {
    // Extract transaction details
    const { transactionId, merchantTransactionId, state, responseCode } = data;
    
    console.log('🔄 Processing webhook:', {
      transactionId,
      merchantTransactionId,
      state,
      responseCode
    });

    // Handle payment success/failure
    if (state === 'COMPLETED' && responseCode === 'SUCCESS') {
      // Payment successful - create booking, update database, etc.
      console.log('✅ Payment successful:', merchantTransactionId);
      
      // Get booking data from localStorage backup or database
      // const bookingData = await getBookingData(merchantTransactionId);
      // await createBookingFromWebhook(bookingData);
      
    } else if (state === 'FAILED') {
      // Payment failed - clean up, notify user, etc.
      console.log('❌ Payment failed:', merchantTransactionId);
      
    } else {
      console.log('ℹ️ Other payment state:', state);
    }

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    throw error;
  }
}
