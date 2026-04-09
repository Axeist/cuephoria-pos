-- Fix booking_views trigger: the legacy trigger that auto-inserts a booking_views row on
-- every new booking was never updated to include location_id after the multi-location
-- migration made that column NOT NULL. Rather than hunting for the unknown trigger
-- function name, we add a BEFORE INSERT trigger directly on booking_views that
-- back-fills location_id from the parent booking whenever it is not supplied.

CREATE OR REPLACE FUNCTION public.booking_views_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If location_id is already provided, do nothing.
  IF NEW.location_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Derive location_id from the parent booking row.
  SELECT location_id
    INTO NEW.location_id
    FROM public.bookings
   WHERE id = NEW.booking_id;

  -- If still null (booking not found yet), fall back to the main location so
  -- the NOT NULL constraint is never violated.
  IF NEW.location_id IS NULL THEN
    SELECT id
      INTO NEW.location_id
      FROM public.locations
     WHERE slug = 'main'
     LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach as BEFORE INSERT so the value is available before the NOT NULL check.
DROP TRIGGER IF EXISTS booking_views_set_location_id ON public.booking_views;
CREATE TRIGGER booking_views_set_location_id
  BEFORE INSERT ON public.booking_views
  FOR EACH ROW
  EXECUTE FUNCTION public.booking_views_set_location_id();

COMMENT ON FUNCTION public.booking_views_set_location_id()
  IS 'Auto-fills booking_views.location_id from the parent bookings row so legacy booking insert triggers continue to work after the multi-location migration.';
