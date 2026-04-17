-- ============================================================================
-- SLICE 2 — Make locations.slug and locations.short_code unique PER ORG,
--          not globally. Required to allow multiple tenants to each have
--          their own "main" branch.
-- ============================================================================
--
-- Safety invariants:
--   1. Cuephoria continues to own slugs 'main', 'lite', 'cafe'. Because it is
--      the only existing organization, scoping the uniqueness constraint to
--      (organization_id, slug) preserves current rows unchanged.
--   2. Idempotent. Safe to re-run.
--   3. Rollback: drop the two new constraints and restore the two old ones.
-- ============================================================================

-- 1) Drop the old global uniqueness constraints if present.
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_slug_unique;
ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_short_code_unique;

-- 2) Add org-scoped uniqueness. Creates a regular UNIQUE btree index.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_org_slug_unique'
  ) THEN
    ALTER TABLE public.locations
      ADD CONSTRAINT locations_org_slug_unique UNIQUE (organization_id, slug);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_org_short_code_unique'
  ) THEN
    ALTER TABLE public.locations
      ADD CONSTRAINT locations_org_short_code_unique UNIQUE (organization_id, short_code);
  END IF;
END$$;

COMMENT ON CONSTRAINT locations_org_slug_unique ON public.locations IS
  'Slug must be unique within an organization, not globally. Multi-tenant safe.';
COMMENT ON CONSTRAINT locations_org_short_code_unique ON public.locations IS
  'Short code must be unique within an organization, not globally. Multi-tenant safe.';


-- 3) Helpful indexes for platform operator queries.
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status ON public.subscriptions (organization_id, status);

-- ============================================================================
-- End of Slice 2 migration.
-- ============================================================================
