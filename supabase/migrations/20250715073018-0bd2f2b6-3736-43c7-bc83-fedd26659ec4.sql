
-- Add credit payment method to bills table by updating the check constraint
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;
ALTER TABLE bills ADD CONSTRAINT bills_payment_method_check CHECK (payment_method IN ('cash', 'upi', 'split', 'credit'));
