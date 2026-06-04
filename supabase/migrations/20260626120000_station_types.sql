-- Custom game station types per branch (PS5, 8 Ball, Snooker, Turf + user-defined).
-- Separate from product/menu categories (food, drinks).

CREATE TABLE IF NOT EXISTS public.station_types (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id          UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL,
  default_max_players  INTEGER NOT NULL DEFAULT 4,
  default_slot_minutes INTEGER NOT NULL DEFAULT 60,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT station_types_location_slug_unique UNIQUE (location_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_station_types_location
  ON public.station_types (location_id, sort_order);

COMMENT ON TABLE public.station_types IS
  'Game station types (PS5, Snooker, Turf, etc.) — not product categories.';

DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.station_types;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.station_types
  FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();

ALTER TABLE public.station_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_types FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staged_rls_allow_all_station_types ON public.station_types;
CREATE POLICY staged_rls_allow_all_station_types ON public.station_types
  FOR ALL USING (true) WITH CHECK (true);

-- Allow custom type slugs on stations (ps5, 8ball, snooker, turf, arcade, …)
ALTER TABLE public.stations DROP CONSTRAINT IF EXISTS stations_type_check;
