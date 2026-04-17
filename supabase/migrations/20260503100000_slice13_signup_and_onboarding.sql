-- ============================================================================
-- Slice 13 — self-service signup + onboarding wizard state
-- ============================================================================
-- Adds two lightweight columns to `organizations` so the onboarding flow has a
-- stable place to persist:
--
--   * business_type           — 'gaming_lounge' | 'cafe' | 'arcade' | 'club' |
--                               'other'. Used to seed reasonable defaults in
--                               the dashboard / feature gates UI.
--   * onboarding_completed_at — null until the new-tenant wizard finishes.
--                               While null, every protected route redirects
--                               owners to /onboarding.
--
-- Cuephoria and any other existing organisations are backfilled to
-- onboarding_completed_at = now() so the live operation never sees the wizard.
--
-- Safety:
--   * Purely additive columns.
--   * Idempotent (IF NOT EXISTS / backfill NOT NULL guarded).
--   * No behaviour change for existing tenants.
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_type           TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Backfill: existing rows are considered "already onboarded" so they skip the
-- new wizard. The timestamp is stamped once; re-running this migration is a
-- no-op thanks to the WHERE clause.
UPDATE public.organizations
   SET onboarding_completed_at = now()
 WHERE onboarding_completed_at IS NULL;

-- Validate business_type values at write time (nullable remains allowed).
DO $$ BEGIN
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_business_type_check
    CHECK (business_type IS NULL OR business_type IN (
      'gaming_lounge', 'cafe', 'arcade', 'club', 'billiards', 'bowling', 'other'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.organizations.business_type IS
  'Tenant self-reported business type from the onboarding wizard. Drives UI defaults; not used for billing.';
COMMENT ON COLUMN public.organizations.onboarding_completed_at IS
  'Timestamp when the owner finished the first-run onboarding wizard. While NULL, owners are gated to /onboarding.';

-- ---------------------------------------------------------------------------
-- Helper index: speed up "needs onboarding" lookups for /api/admin/me.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_pending
  ON public.organizations (id)
  WHERE onboarding_completed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Seed: ensure a `starter` plan exists (it was seeded in Slice 0 but this is
-- a defensive no-op in case of partial environments). Signup always provisions
-- onto `starter` by default; the owner can switch from /settings/billing.
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (code, name, is_public, price_inr_month, price_inr_year, sort_order, is_active)
VALUES ('starter', 'Starter', true, 1999, 19990, 10, true)
ON CONFLICT (code) DO NOTHING;
