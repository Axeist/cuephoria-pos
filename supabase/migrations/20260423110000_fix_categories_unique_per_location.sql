-- Fix categories uniqueness for multi-location onboarding.
-- Legacy schema kept UNIQUE(name), which breaks tenant/location seeding
-- when common names like "beverages" already exist elsewhere.

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_name_key;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_name_location_key UNIQUE (name, location_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX IF NOT EXISTS idx_categories_name_location
  ON public.categories (name, location_id);

COMMENT ON CONSTRAINT categories_name_location_key ON public.categories
  IS 'Category names are unique within a branch (location), not globally.';

