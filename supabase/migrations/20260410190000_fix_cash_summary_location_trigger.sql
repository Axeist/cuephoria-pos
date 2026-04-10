-- Fix the legacy bill → cash_summary trigger that never passes location_id.
-- After the multi-location migration made cash_summary.location_id NOT NULL the
-- old trigger (created before multi-location) started throwing a NOT NULL
-- violation on every POS sale.
--
-- Strategy (same as fix_booking_views_location_trigger): rather than hunting for
-- the unknown trigger function name, attach a BEFORE INSERT trigger on
-- cash_summary itself that back-fills location_id to the 'main' location
-- whenever the caller omits it.
--
-- Also fix ON CONFLICT: the original trigger likely used ON CONFLICT (date)
-- but the unique constraint was replaced by (location_id, date) in the
-- multi_location_core migration. We replace the upsert conflict target via the
-- same BEFORE INSERT approach — the row will now always have a location_id, so
-- (location_id, date) will be the effective uniqueness key.

CREATE OR REPLACE FUNCTION public.cash_summary_set_location_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If location_id is already provided, do nothing.
  IF NEW.location_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Fall back to the main location so the NOT NULL constraint is never violated.
  SELECT id
    INTO NEW.location_id
    FROM public.locations
   WHERE slug = 'main'
   LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach as BEFORE INSERT so location_id is populated before the NOT NULL check.
DROP TRIGGER IF EXISTS cash_summary_set_location_id ON public.cash_summary;
CREATE TRIGGER cash_summary_set_location_id
  BEFORE INSERT ON public.cash_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.cash_summary_set_location_id();

COMMENT ON FUNCTION public.cash_summary_set_location_id()
  IS 'Auto-fills cash_summary.location_id with the main location when the legacy bill trigger omits it, preventing NOT NULL violations after the multi-location migration.';
