-- Saved POS carts: persisted per location (branch) within an organization.
-- One row per customer per location; items stored as JSONB for global sync.

CREATE TABLE IF NOT EXISTS public.saved_carts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  location_id         UUID NOT NULL REFERENCES public.locations (id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  customer_name       TEXT NOT NULL,
  items               JSONB NOT NULL DEFAULT '[]'::jsonb,
  discount            NUMERIC NOT NULL DEFAULT 0,
  discount_type       TEXT NOT NULL DEFAULT 'percentage'
                        CHECK (discount_type IN ('percentage', 'fixed')),
  loyalty_points_used NUMERIC NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT saved_carts_location_customer_unique UNIQUE (location_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_carts_location_updated
  ON public.saved_carts (location_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_carts_organization
  ON public.saved_carts (organization_id);

CREATE INDEX IF NOT EXISTS idx_saved_carts_expires
  ON public.saved_carts (expires_at);

COMMENT ON TABLE public.saved_carts IS
  'Pending POS carts parked per customer per branch. Scoped by location_id + organization_id for multi-tenant isolation.';

-- Auto-fill organization_id from location (matches other ops tables).
DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.saved_carts;
CREATE TRIGGER trg_fill_organization_id
  BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.saved_carts
  FOR EACH ROW EXECUTE FUNCTION public.fill_organization_id_from_location();

CREATE OR REPLACE FUNCTION public.touch_saved_carts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.expires_at := now() + interval '24 hours';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_carts_updated_at ON public.saved_carts;
CREATE TRIGGER trg_saved_carts_updated_at
  BEFORE UPDATE ON public.saved_carts
  FOR EACH ROW EXECUTE FUNCTION public.touch_saved_carts_updated_at();

-- Staged permissive RLS (same pattern as bills, customers, etc.)
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_carts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staged_rls_allow_all_saved_carts ON public.saved_carts;
CREATE POLICY staged_rls_allow_all_saved_carts ON public.saved_carts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Realtime sync across POS terminals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'saved_carts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_carts;
  END IF;
END$$;
