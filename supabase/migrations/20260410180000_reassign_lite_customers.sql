-- Reassign customers that were incorrectly backfilled to the 'main' location.
--
-- Background: the multi-location core migration set location_id = 'main' for
-- every customer whose location_id was NULL at the time it ran.  Customers that
-- were subsequently created via the admin UI for the Lite branch should already
-- carry the correct location_id.  However, any customer that was created while
-- activeLocationId was still being resolved (race on first load) would have been
-- silently inserted without a location_id and then clamped to 'main'.
--
-- HOW TO USE:
--   Option A – run as-is to see which customers are in 'main' (SELECT only).
--   Option B – uncomment the UPDATE block to move specific customers to 'lite'.
--
-- Step 1: Identify all customers currently assigned to 'main'
SELECT
  c.id,
  c.name,
  c.phone,
  c.email,
  c.created_at,
  l.slug AS current_location
FROM public.customers c
JOIN public.locations l ON l.id = c.location_id
ORDER BY c.created_at DESC;

-- Step 2 (optional): Move ALL customers created *after* the multi-location
-- migration ran (2026-04-09 12:00 UTC) from 'main' to 'lite' only if they do
-- not already have a duplicate in 'lite' with the same phone number.
--
-- Uncomment and adjust the WHERE clause as needed before running.
--
-- UPDATE public.customers
--    SET location_id = (SELECT id FROM public.locations WHERE slug = 'lite' LIMIT 1)
--  WHERE location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
--    AND created_at >= '2026-04-09 12:00:00+00'        -- only after backfill ran
--    AND phone NOT IN (                                 -- no duplicate in lite already
--          SELECT phone
--          FROM public.customers
--          WHERE location_id = (SELECT id FROM public.locations WHERE slug = 'lite' LIMIT 1)
--        );

-- Step 3 (targeted): Move a specific customer by phone number to 'lite'.
--
-- UPDATE public.customers
--    SET location_id = (SELECT id FROM public.locations WHERE slug = 'lite' LIMIT 1)
--  WHERE phone = '91XXXXXXXXXX'  -- replace with actual phone
--    AND location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1);
