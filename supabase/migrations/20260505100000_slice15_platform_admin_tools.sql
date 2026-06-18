-- ============================================================================
-- Slice 15: Platform admin tooling — delete org RPC + plans.description
-- ============================================================================
-- What this migration adds:
--
--   1. plans.description   — textual blurb shown in the operator plans page.
--                            The `GET /api/platform/plans` handler already
--                            selects this column; without it the endpoint
--                            returns a 500. Nullable, no default.
--
--   2. platform_delete_organization(org_id, confirm_slug)
--                          — SECURITY DEFINER function that fully erases a
--                            tenant. Designed to be called ONLY from the
--                            platform-admin edge handler (service role); the
--                            `confirm_slug` argument is a finger-trap to
--                            ensure the caller really meant this org.
--
-- Delete order matters. Several operational tables reference organizations
-- without ON DELETE CASCADE, so a naive DELETE FROM organizations will fail.
-- We clear children first (leaves → parents) and let the remaining CASCADE /
-- SET NULL FKs do their thing when the org row itself is finally deleted.
--
-- ROLLBACK
--   DROP FUNCTION IF EXISTS public.platform_delete_organization(UUID, TEXT);
--   ALTER TABLE public.plans DROP COLUMN IF EXISTS description;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) plans.description
-- ---------------------------------------------------------------------------
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.plans.description IS
  'Optional human-readable blurb (one sentence) shown in the operator plans editor.';


-- ---------------------------------------------------------------------------
-- 2) Hard-delete RPC
-- ---------------------------------------------------------------------------
--
-- Why SECURITY DEFINER:
--   The platform edge handler runs with the service role, which already
--   bypasses RLS, so strictly we don't need DEFINER. But wrapping all the
--   deletes into one PL/pgSQL function means:
--     * we get an implicit transaction (all-or-nothing),
--     * the operator handler becomes a single RPC call instead of a dozen,
--     * the fingertrap (confirm_slug) is enforced at the DB layer too.
--
-- Safety rails:
--   * Refuses if confirm_slug doesn't match the row's slug.
--   * Refuses if is_internal = true (the Cuephoria parent org).
--   * Returns a counts JSONB so the caller can show the user what happened.
--
CREATE OR REPLACE FUNCTION public.platform_delete_organization(
  org_id        UUID,
  confirm_slug  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org              public.organizations%ROWTYPE;
  v_sessions         INT := 0;
  v_bookings         INT := 0;
  v_bill_items       INT := 0;
  v_bills            INT := 0;
  v_customers        INT := 0;
  v_products         INT := 0;
  v_categories       INT := 0;
  v_stations         INT := 0;
  v_locations        INT := 0;
  v_memberships      INT := 0;
  v_subscriptions    INT := 0;
  v_invoices         INT := 0;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = org_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization % not found.', org_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_org.slug <> confirm_slug THEN
    RAISE EXCEPTION 'confirm_slug "%" does not match organization slug "%".', confirm_slug, v_org.slug
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_org.is_internal IS TRUE THEN
    RAISE EXCEPTION 'Organization "%" is internal and cannot be deleted.', v_org.slug
      USING ERRCODE = 'check_violation';
  END IF;

  -- ── operational tenant data ────────────────────────────────────────────
  -- Leaves first, then their parents. Each DELETE uses a CTE + count so we
  -- can return a breakdown to the caller.

  WITH d AS (DELETE FROM public.sessions   WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_sessions FROM d;

  WITH d AS (DELETE FROM public.bookings   WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_bookings FROM d;

  WITH d AS (DELETE FROM public.bill_items WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_bill_items FROM d;

  WITH d AS (DELETE FROM public.bills      WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_bills FROM d;

  WITH d AS (DELETE FROM public.customers  WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_customers FROM d;

  WITH d AS (DELETE FROM public.products   WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_products FROM d;

  WITH d AS (DELETE FROM public.categories WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_categories FROM d;

  WITH d AS (DELETE FROM public.stations   WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_stations FROM d;

  WITH d AS (DELETE FROM public.locations  WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_locations FROM d;

  -- memberships / subscriptions / invoices CASCADE from organizations, but
  -- we count them here for the report before the parent delete fires.
  SELECT COUNT(*) INTO v_memberships    FROM public.org_memberships WHERE organization_id = org_id;
  SELECT COUNT(*) INTO v_subscriptions  FROM public.subscriptions   WHERE organization_id = org_id;
  SELECT COUNT(*) INTO v_invoices       FROM public.invoices        WHERE organization_id = org_id;

  -- ── the org row itself (triggers CASCADE + SET NULL on remaining FKs) ──
  DELETE FROM public.organizations WHERE id = org_id;

  RETURN jsonb_build_object(
    'org_id',          org_id,
    'slug',            v_org.slug,
    'name',            v_org.name,
    'counts', jsonb_build_object(
      'sessions',       v_sessions,
      'bookings',       v_bookings,
      'bill_items',     v_bill_items,
      'bills',          v_bills,
      'customers',      v_customers,
      'products',       v_products,
      'categories',     v_categories,
      'stations',       v_stations,
      'locations',      v_locations,
      'memberships',    v_memberships,
      'subscriptions',  v_subscriptions,
      'invoices',       v_invoices
    )
  );
END;
$$;

COMMENT ON FUNCTION public.platform_delete_organization(UUID, TEXT) IS
  'Platform-admin only: hard-delete a tenant and its operational data in one transaction. '
  'Requires confirm_slug to match and is_internal=false. Returns counts JSONB.';

-- Lock the function down. Only service_role should be able to call it.
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.platform_delete_organization(UUID, TEXT) TO service_role;
