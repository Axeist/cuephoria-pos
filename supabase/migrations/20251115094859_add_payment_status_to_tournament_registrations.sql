-- Add payment_status column to tournament_public_registrations table
-- This column tracks whether the registration payment has been completed

ALTER TABLE public.tournament_public_registrations
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Update existing registrations to have 'pending' status if they don't have one
UPDATE public.tournament_public_registrations
SET payment_status = 'pending'
WHERE payment_status IS NULL;

-- Add a comment to the column
COMMENT ON COLUMN public.tournament_public_registrations.payment_status IS 'Payment status: pending, paid, failed, or refunded';

