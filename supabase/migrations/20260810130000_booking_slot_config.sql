-- Workspace defaults for public booking slot grid + minimum session length.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_slot_interval_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS default_minimum_booking_minutes INTEGER NOT NULL DEFAULT 60;

COMMENT ON COLUMN public.organizations.default_slot_interval_minutes IS
  'Public booking grid step in minutes (30 or 60). Default 60 preserves legacy hourly grid.';

COMMENT ON COLUMN public.organizations.default_minimum_booking_minutes IS
  'Minimum session length customers must book (30 or 60). Must be >= interval and a multiple of it.';

-- Backfill explicit 60 for any nulls (should not happen with NOT NULL DEFAULT).
UPDATE public.organizations
SET
  default_slot_interval_minutes = COALESCE(default_slot_interval_minutes, 60),
  default_minimum_booking_minutes = COALESCE(default_minimum_booking_minutes, 60)
WHERE default_slot_interval_minutes IS NULL
   OR default_minimum_booking_minutes IS NULL;
