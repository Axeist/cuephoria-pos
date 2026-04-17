-- ============================================================================
-- HOTFIX — auto-fill organization_id on operational tables.
--
-- Context
--   Slice 0 (migration 20260421100000) added `organization_id` to every
--   operational table and flipped it to NOT NULL once backfilled. Existing
--   app code paths (public bookings, POS, admin-created sessions, etc.)
--   still only supply `location_id` on INSERT, which now fails with:
--     null value in column "organization_id" of relation "bookings"
--       violates not-null constraint
--
-- Fix
--   One trigger function that, BEFORE INSERT OR UPDATE, fills NEW.organization_id
--   from locations.organization_id whenever location_id is present and
--   organization_id is NULL. Attached to every operational table that went
--   NOT NULL in Slice 0.
--
-- Why a trigger instead of client fixes
--   * Fixes every code path atomically (public booking, admin booking,
--     POS bills, sessions, customer create, product create, etc.).
--   * Cannot break existing rows — trigger only fills NULLs.
--   * Does not alter existing behaviour when the caller DOES provide
--     organization_id explicitly (platform admin, platform APIs, etc.).
--
-- Rollback
--   DROP TRIGGER IF EXISTS ... ON each table; DROP FUNCTION.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fill_organization_id_from_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_org UUID;
BEGIN
  IF NEW.organization_id IS NULL AND NEW.location_id IS NOT NULL THEN
    SELECT l.organization_id
      INTO resolved_org
      FROM public.locations l
     WHERE l.id = NEW.location_id;

    IF resolved_org IS NOT NULL THEN
      NEW.organization_id := resolved_org;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fill_organization_id_from_location() IS
  'Auto-populates organization_id on operational tables from locations.organization_id whenever caller supplies location_id but not organization_id. Never overwrites an explicit value.';

-- Attach to every table that holds (location_id, organization_id NOT NULL).
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'stations',
    'categories',
    'products',
    'customers',
    'bills',
    'bill_items',
    'bookings',
    'sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_fill_organization_id ON public.%I;',
      t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_fill_organization_id
         BEFORE INSERT OR UPDATE OF location_id, organization_id ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.fill_organization_id_from_location();',
      t
    );
  END LOOP;
END$$;

-- ----------------------------------------------------------------------------
-- Safety net: heal any rows that somehow slipped through with NULLs while
-- this migration was being deployed (defensive; the NOT NULL constraint
-- would normally block these already).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'stations','categories','products','customers',
    'bills','bill_items','bookings','sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'UPDATE public.%I x
          SET organization_id = l.organization_id
         FROM public.locations l
        WHERE x.location_id = l.id
          AND x.organization_id IS NULL;',
      t
    );
  END LOOP;
END$$;
