-- static: flat rate per hour/slot (8 ball, turf, VR table fee)
-- per_player: occupancy grid — rate varies by player count (PS5 couch, etc.)

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'static'
    CHECK (pricing_mode IN ('static', 'per_player'));

COMMENT ON COLUMN public.stations.pricing_mode IS
  'static = flat hourly_rate; per_player = occupancy_rates × player count';

UPDATE public.stations
SET pricing_mode = 'per_player'
WHERE pricing_mode = 'static'
  AND occupancy_rates IS NOT NULL
  AND occupancy_rates <> '{}'::jsonb;
