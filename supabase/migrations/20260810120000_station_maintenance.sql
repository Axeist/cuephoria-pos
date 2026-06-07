-- Station maintenance: temporary closure for public booking + session block with audit trail.

ALTER TABLE stations
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_planned_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_started_by TEXT;

CREATE TABLE IF NOT EXISTS station_maintenance_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  planned_end_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  started_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_station_maintenance_periods_station
  ON station_maintenance_periods (station_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_station_maintenance_periods_location_range
  ON station_maintenance_periods (location_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_station_maintenance_periods_open
  ON station_maintenance_periods (station_id)
  WHERE ended_at IS NULL;
