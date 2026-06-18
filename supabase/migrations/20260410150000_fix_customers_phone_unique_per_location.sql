-- Fix customers table for multi-location: phone must be unique PER location, not globally.
-- The original Supabase schema had UNIQUE (phone), which means the same phone number
-- can't be used to create separate customer records for each branch.

-- Drop the old global phone unique constraint (Supabase default naming convention).
-- Using IF EXISTS so this is safe to run even if the constraint was already dropped.
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_phone_key;

-- Also drop custom_id uniqueness if it exists globally (same multi-location issue).
ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_custom_id_key;

-- Add composite unique: one customer per phone number per location.
ALTER TABLE public.customers
  ADD CONSTRAINT customers_phone_location_key UNIQUE (phone, location_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Add composite unique: custom_id is unique per location.
ALTER TABLE public.customers
  ADD CONSTRAINT customers_custom_id_location_key UNIQUE (custom_id, location_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Index to speed up phone lookups scoped to a location (used by public booking & get-customer).
CREATE INDEX IF NOT EXISTS idx_customers_phone_location
  ON public.customers (phone, location_id);

COMMENT ON CONSTRAINT customers_phone_location_key ON public.customers
  IS 'A customer phone number is unique within a branch, not globally.';
