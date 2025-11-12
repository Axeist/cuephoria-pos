-- Add payment tracking columns to bookings table
-- This allows distinguishing between paid and unpaid bookings
-- and tracking payment transaction IDs for online payments

-- Add payment_mode column (e.g., 'venue', 'razorpay', 'phonepe', etc.)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- Add payment_txn_id column to store payment transaction/order IDs
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_txn_id TEXT;

-- Add index on payment_mode for faster queries filtering by payment type
CREATE INDEX IF NOT EXISTS idx_bookings_payment_mode ON public.bookings(payment_mode);

-- Add index on payment_txn_id for faster lookups by transaction ID
CREATE INDEX IF NOT EXISTS idx_bookings_payment_txn_id ON public.bookings(payment_txn_id);

-- Add comment to document the columns
COMMENT ON COLUMN public.bookings.payment_mode IS 'Payment method used: venue, razorpay, phonepe, etc. NULL means unpaid/venue payment';
COMMENT ON COLUMN public.bookings.payment_txn_id IS 'Payment transaction/order ID from payment gateway (e.g., Razorpay payment_id or order_id)';

