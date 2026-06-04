-- Multi-player stations: max_players + occupancy-based per-person pricing.
-- Safe legacy migration via station_id_migrations + migrate_station_data RPC.

ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS max_players INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occupancy_rates JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS player_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS per_person_rate NUMERIC;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS player_count INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.stations.max_players IS
  'Maximum simultaneous players on this physical station (console/table/booth).';
COMMENT ON COLUMN public.stations.occupancy_rates IS
  'Per-person rate by player count, e.g. {"1":200,"2":150,"3":120,"4":100}. Total = rate * count.';

-- Backfill max_players from legacy max_capacity where set
UPDATE public.stations
SET max_players = GREATEST(1, COALESCE(max_capacity, 1))
WHERE max_players = 1 AND COALESCE(max_capacity, 1) > 1;

CREATE TABLE IF NOT EXISTS public.station_id_migrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id       UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  old_station_id    UUID NOT NULL,
  new_station_id    UUID NOT NULL REFERENCES public.stations (id) ON DELETE CASCADE,
  old_station_name  TEXT NOT NULL,
  migrated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  migrated_by       TEXT
);

CREATE INDEX IF NOT EXISTS idx_station_id_migrations_old
  ON public.station_id_migrations (old_station_id);
CREATE INDEX IF NOT EXISTS idx_station_id_migrations_new
  ON public.station_id_migrations (new_station_id);
CREATE INDEX IF NOT EXISTS idx_station_id_migrations_location
  ON public.station_id_migrations (location_id);

ALTER TABLE public.station_id_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_id_migrations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staged_rls_allow_all_station_id_migrations ON public.station_id_migrations;
CREATE POLICY staged_rls_allow_all_station_id_migrations ON public.station_id_migrations
  FOR ALL USING (true) WITH CHECK (true);

-- Repoint historical data from legacy controller rows to a new consolidated station, then delete old rows.
CREATE OR REPLACE FUNCTION public.migrate_station_data(
  p_old_ids UUID[],
  p_new_station_id UUID,
  p_migrated_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_location_id UUID;
  v_new_org_id UUID;
  v_old_id UUID;
  v_old_name TEXT;
  v_old_location_id UUID;
  v_migrated_count INT := 0;
  v_sessions_updated INT := 0;
  v_bookings_updated INT := 0;
BEGIN
  IF p_old_ids IS NULL OR array_length(p_old_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_old_ids must not be empty';
  END IF;

  IF p_new_station_id = ANY(p_old_ids) THEN
    RAISE EXCEPTION 'new station cannot be in the list of old stations';
  END IF;

  SELECT location_id, organization_id
  INTO v_new_location_id, v_new_org_id
  FROM public.stations
  WHERE id = p_new_station_id;

  IF v_new_location_id IS NULL THEN
    RAISE EXCEPTION 'new station not found: %', p_new_station_id;
  END IF;

  FOREACH v_old_id IN ARRAY p_old_ids LOOP
    SELECT name, location_id INTO v_old_name, v_old_location_id
    FROM public.stations WHERE id = v_old_id;

    IF v_old_name IS NULL THEN
      RAISE EXCEPTION 'old station not found: %', v_old_id;
    END IF;

    IF v_old_location_id <> v_new_location_id THEN
      RAISE EXCEPTION 'station % belongs to a different location', v_old_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.stations
      WHERE id = v_old_id AND is_occupied = true
    ) THEN
      RAISE EXCEPTION 'station % is currently occupied; end session before migrating', v_old_name;
    END IF;
  END LOOP;

  UPDATE public.sessions
  SET station_id = p_new_station_id
  WHERE station_id = ANY(p_old_ids);
  GET DIAGNOSTICS v_sessions_updated = ROW_COUNT;

  UPDATE public.bookings
  SET station_id = p_new_station_id
  WHERE station_id = ANY(p_old_ids);
  GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;

  FOREACH v_old_id IN ARRAY p_old_ids LOOP
    SELECT name INTO v_old_name FROM public.stations WHERE id = v_old_id;

    INSERT INTO public.station_id_migrations (
      organization_id, location_id, old_station_id, new_station_id,
      old_station_name, migrated_by
    ) VALUES (
      v_new_org_id, v_new_location_id, v_old_id, p_new_station_id,
      v_old_name, p_migrated_by
    );

    DELETE FROM public.stations WHERE id = v_old_id;
    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'migrated_stations', v_migrated_count,
    'sessions_updated', v_sessions_updated,
    'bookings_updated', v_bookings_updated,
    'new_station_id', p_new_station_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrate_station_data(UUID[], UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_station_data(UUID[], UUID, TEXT) TO service_role;
