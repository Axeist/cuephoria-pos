ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS special_instructions TEXT;

COMMENT ON COLUMN public.bookings.special_instructions IS 'Customer game/special requests from public booking';
