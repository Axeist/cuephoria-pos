-- Add razorpay payment method to bills table
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;
ALTER TABLE bills ADD CONSTRAINT bills_payment_method_check 
  CHECK (payment_method IN ('cash', 'upi', 'split', 'credit', 'razorpay', 'complimentary'));

