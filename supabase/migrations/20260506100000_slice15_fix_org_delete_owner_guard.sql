-- ============================================================================
-- Slice 15 follow-up: let platform_delete_organization bypass the
-- "last owner" guard trigger.
-- ============================================================================
--
-- Background
--   Slice 3 added a BEFORE DELETE / UPDATE OF role trigger on
--   org_memberships (`org_memberships_prevent_last_owner`) that refuses to
--   drop the last owner of an organization. That guard is correct for normal
--   app flows but it also fires during CASCADE deletion of memberships when
--   the parent organization row is dropped, which makes
--   platform_delete_organization impossible to complete on any org that has
--   an owner (i.e. every real org).
--
-- Fix (two parts)
--   1. Teach the trigger to honour a transaction-local session flag
--      `app.skip_last_owner_guard = on`. When set, the guard returns
--      immediately. The flag is scoped to the current transaction via
--      set_config(..., TRUE) so it can never leak to other statements /
--      sessions.
--   2. Teach platform_delete_organization to:
--        a. flip that flag on for its own transaction,
--        b. explicitly DELETE rows from org_memberships, subscriptions,
--           and invoices *before* dropping the org, so the counts we return
--           match what actually happened (and so the guard bypass is
--           contained to exactly those DELETEs).
--      This also dodges a separate gotcha: invoices → subscriptions has its
--      own FK; by deleting invoices first we keep the whole sequence
--      deterministic regardless of whether subscription FKs are declared
--      CASCADE or SET NULL.
--
-- ROLLBACK
--   Re-run the body of slice3 for the trigger function, and the body of
--   slice15 for platform_delete_organization, to revert both.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Guard trigger: opt-in bypass flag
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_owners INT;
  affected_org UUID;
  this_row_id UUID;
  bypass TEXT;
BEGIN
  -- Transaction-local bypass. `current_setting(..., TRUE)` returns NULL if
  -- the GUC has never been set in this session, which is the common case,
  -- so this is a cheap no-op for normal writes.
  bypass := current_setting('app.skip_last_owner_guard', TRUE);
  IF bypass = 'on' THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'owner' THEN
      RETURN OLD;
    END IF;
    affected_org := OLD.organization_id;
    this_row_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role <> 'owner' OR NEW.role = 'owner' THEN
      RETURN NEW;
    END IF;
    affected_org := OLD.organization_id;
    this_row_id := OLD.id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO remaining_owners
  FROM public.org_memberships
  WHERE organization_id = affected_org
    AND role = 'owner'
    AND id <> this_row_id;

  IF remaining_owners = 0 THEN
    RAISE EXCEPTION
      'Cannot remove or demote the last owner of organization %', affected_org
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

COMMENT ON FUNCTION public.prevent_last_owner_removal IS
  'Refuses any DELETE or UPDATE of role that would leave an organization without an owner. '
  'Honours the transaction-local GUC app.skip_last_owner_guard=on for privileged platform ops.';


-- ---------------------------------------------------------------------------
-- 2) Hard-delete RPC: explicit child DELETEs + guard bypass
-- ---------------------------------------------------------------------------
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

  -- Flip the last-owner guard off for this transaction only. set_config's
  -- third arg = TRUE scopes it to the current transaction; it is
  -- automatically reset on COMMIT/ROLLBACK and never visible to other
  -- sessions.
  PERFORM set_config('app.skip_last_owner_guard', 'on', TRUE);

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

  -- Billing / membership rows. Deleted explicitly (rather than relying on
  -- CASCADE) so we (a) get accurate counts for the caller and (b) keep the
  -- last-owner guard bypass scoped to the actual DELETEs that need it.
  WITH d AS (DELETE FROM public.invoices        WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_invoices FROM d;

  WITH d AS (DELETE FROM public.subscriptions   WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_subscriptions FROM d;

  WITH d AS (DELETE FROM public.org_memberships WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_memberships FROM d;

  -- ── the org row itself ────────────────────────────────────────────────
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
  'Requires confirm_slug to match and is_internal=false. Bypasses the last-owner guard '
  'for this transaction only via set_config(app.skip_last_owner_guard, on, TRUE). '
  'Returns counts JSONB.';

REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.platform_delete_organization(UUID, TEXT) TO service_role;
