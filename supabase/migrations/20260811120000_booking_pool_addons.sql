-- Pool / snooker booking add-ons (premium cue, gloves, coaching) on public booking.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_addons jsonb;

COMMENT ON COLUMN public.bookings.booking_addons IS
  'Selected pool-table add-ons for this booking: { items: [{id,name,price}], total }';
