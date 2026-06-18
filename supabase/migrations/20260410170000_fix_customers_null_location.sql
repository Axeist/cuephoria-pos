-- Assign any customers without a location_id to the main location.
-- This fixes customers created before location_id was added to the insert.
UPDATE public.customers
   SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
 WHERE location_id IS NULL;
