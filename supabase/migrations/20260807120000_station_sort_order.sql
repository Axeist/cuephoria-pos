-- Custom station grid order (drag-and-drop on Station Command)

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_stations_location_sort
  ON public.stations (location_id, sort_order);

COMMENT ON COLUMN public.stations.sort_order IS
  'Display order on Station Command (lower = first). Updated via drag-and-drop.';
