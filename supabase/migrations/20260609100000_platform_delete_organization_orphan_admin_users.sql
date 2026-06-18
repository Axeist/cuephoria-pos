-- ============================================================================
-- Platform delete org: remove orphan tenant admin_users (release email)
-- ============================================================================
--
-- Background
--   platform_delete_organization removes org_memberships but left admin_users
--   rows intact. Signup checks admin_users.email uniqueness, so deleted-tenant
--   owners could never re-register with the same email.
--
-- Fix
--   After deleting memberships for the org, hard-delete any admin_users who
--   no longer have any org_memberships, except is_super_admin rows (platform
--   operators must not lose identity when a stray org is removed).
--
--   cafe_settlements.confirmed_by references admin_users without ON DELETE;
--   null it out before dropping users.
-- ============================================================================

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
  v_org                    public.organizations%ROWTYPE;
  v_sessions               INT := 0;
  v_bookings               INT := 0;
  v_bill_items             INT := 0;
  v_bills                  INT := 0;
  v_customers              INT := 0;
  v_products               INT := 0;
  v_categories             INT := 0;
  v_stations               INT := 0;
  v_locations              INT := 0;
  v_memberships            INT := 0;
  v_subscriptions          INT := 0;
  v_invoices               INT := 0;
  v_orphan_admin_deleted   INT := 0;
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

  PERFORM set_config('app.skip_last_owner_guard', 'on', TRUE);

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

  WITH d AS (DELETE FROM public.invoices        WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_invoices FROM d;

  WITH d AS (DELETE FROM public.subscriptions   WHERE organization_id = org_id RETURNING 1)
  SELECT COUNT(*) INTO v_subscriptions FROM d;

  -- Memberships removed first; then drop tenant users who have no other orgs
  -- so emails/usernames can be reused on signup.
  WITH removed AS (
    DELETE FROM public.org_memberships WHERE organization_id = org_id RETURNING admin_user_id
  ),
  member_rows AS (
    SELECT COUNT(*)::int AS c FROM removed
  ),
  orphan AS (
    SELECT DISTINCT r.admin_user_id AS id
    FROM removed r
    WHERE NOT EXISTS (
      SELECT 1 FROM public.org_memberships m WHERE m.admin_user_id = r.admin_user_id
    )
  ),
  _clear_cafe AS (
    UPDATE public.cafe_settlements c
    SET confirmed_by = NULL
    WHERE c.confirmed_by IN (SELECT id FROM orphan)
    RETURNING 1
  ),
  _del_admins AS (
    DELETE FROM public.admin_users u
    WHERE u.id IN (SELECT id FROM orphan)
      AND COALESCE(u.is_super_admin, FALSE) IS NOT TRUE
    RETURNING u.id
  )
  SELECT
    mr.c,
    (SELECT COUNT(*)::int FROM _del_admins)
  INTO v_memberships, v_orphan_admin_deleted
  FROM member_rows mr;

  DELETE FROM public.organizations WHERE id = org_id;

  RETURN jsonb_build_object(
    'org_id',          org_id,
    'slug',            v_org.slug,
    'name',            v_org.name,
    'counts', jsonb_build_object(
      'sessions',              v_sessions,
      'bookings',              v_bookings,
      'bill_items',            v_bill_items,
      'bills',                 v_bills,
      'customers',             v_customers,
      'products',              v_products,
      'categories',            v_categories,
      'stations',              v_stations,
      'locations',             v_locations,
      'memberships',           v_memberships,
      'subscriptions',         v_subscriptions,
      'invoices',              v_invoices,
      'orphan_admin_users',    v_orphan_admin_deleted
    )
  );
END;
$$;

COMMENT ON FUNCTION public.platform_delete_organization(UUID, TEXT) IS
  'Platform-admin only: hard-delete a tenant and its operational data in one transaction. '
  'Requires confirm_slug to match and is_internal=false. '
  'Deletes org_memberships then removes admin_users rows that have no remaining org '
  '(except is_super_admin), so signup can reuse email. '
  'Bypasses the last-owner guard via set_config(app.skip_last_owner_guard, on, TRUE).';

REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.platform_delete_organization(UUID, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.platform_delete_organization(UUID, TEXT) TO service_role;
