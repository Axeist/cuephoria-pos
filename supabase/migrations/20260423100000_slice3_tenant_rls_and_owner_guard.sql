-- ============================================================================
-- SLICE 3 — Safety rails for multi-tenancy control plane.
--
-- 1. Enable RLS on control tables. Every existing read path for these tables
--    uses the Supabase service role, which bypasses RLS. Browsers never
--    query these directly. Enabling RLS with zero policies = fail-closed.
-- 2. Add a BEFORE-trigger on org_memberships that prevents removing / demoting
--    the last owner of an organization.
-- 3. Add helpful indexes.
--
-- Rollback strategy:
--   DROP TRIGGER ... ; DROP FUNCTION ...; then ALTER TABLE ... DISABLE ROW
--   LEVEL SECURITY on each of the below. Safe to re-run — everything guarded.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Row-Level Security on control-plane tables.
--    Service role always bypasses RLS. No policies = deny all other roles.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations',
    'plans',
    'plan_features',
    'subscriptions',
    'org_memberships',
    'platform_admins',
    'audit_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
  END LOOP;
END$$;

COMMENT ON TABLE public.organizations IS
  'RLS enabled. Service role only. Tenant-scoped reads introduced in Slice 4+.';
COMMENT ON TABLE public.org_memberships IS
  'Join table admin_users ↔ organizations. RLS enabled; service role only.';
COMMENT ON TABLE public.platform_admins IS
  'Cuetronix operator accounts. RLS enabled; never accessed from browser.';
COMMENT ON TABLE public.audit_log IS
  'Append-only platform & tenant activity log. RLS enabled; service role only.';


-- ---------------------------------------------------------------------------
-- 2) Prevent the last owner of an org from being removed/demoted.
--    Fires on DELETE of an owner row, or UPDATE that changes role away from
--    'owner'. Raises check_violation if zero other owners would remain.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_owners INT;
  affected_org UUID;
  this_row_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role <> 'owner' THEN
      RETURN OLD;
    END IF;
    affected_org := OLD.organization_id;
    this_row_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only relevant when the role transitions away from 'owner'.
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

DROP TRIGGER IF EXISTS org_memberships_prevent_last_owner ON public.org_memberships;
CREATE TRIGGER org_memberships_prevent_last_owner
  BEFORE DELETE OR UPDATE OF role ON public.org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_owner_removal();

COMMENT ON FUNCTION public.prevent_last_owner_removal IS
  'Refuses any DELETE or UPDATE of role that would leave an organization without an owner.';


-- ---------------------------------------------------------------------------
-- 3) Indexes that help the invite / members / tenant-settings flows.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_role
  ON public.org_memberships (organization_id, role);

CREATE INDEX IF NOT EXISTS idx_admin_user_locations_user
  ON public.admin_user_locations (admin_user_id);

-- ============================================================================
-- End of Slice 3 migration.
-- ============================================================================
