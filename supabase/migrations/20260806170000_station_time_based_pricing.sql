-- Time-based pricing: configurable duration tiers (e.g. 30 min @ ₹250, 60 min @ ₹400)

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS duration_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.stations DROP CONSTRAINT IF EXISTS stations_pricing_mode_check;

ALTER TABLE public.stations
  ADD CONSTRAINT stations_pricing_mode_check
  CHECK (pricing_mode IN ('static', 'per_player', 'time_based'));

COMMENT ON COLUMN public.stations.duration_tiers IS
  'Array of {minutes, price} tiers for time_based pricing mode';
