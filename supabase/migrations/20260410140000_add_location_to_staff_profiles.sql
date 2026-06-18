-- Add location_id to staff_profiles so staff are scoped to a branch.
-- Existing staff are assigned to the main branch (backfill).

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id);

UPDATE public.staff_profiles
  SET location_id = (SELECT id FROM public.locations WHERE slug = 'main' LIMIT 1)
  WHERE location_id IS NULL;

ALTER TABLE public.staff_profiles
  ALTER COLUMN location_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_profiles_location_id
  ON public.staff_profiles (location_id);

COMMENT ON COLUMN public.staff_profiles.location_id
  IS 'Branch this staff member belongs to. Filters staff by active location in the admin dashboard.';
