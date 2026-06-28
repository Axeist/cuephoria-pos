-- ============================================================================
-- Signup pending approval + owner phone
-- ============================================================================
-- Rollback:
--   DROP INDEX IF EXISTS idx_organizations_pending_approval;
--   ALTER TABLE public.admin_users DROP COLUMN IF EXISTS phone;
--   ALTER TABLE public.organizations DROP CONSTRAINT organizations_status_check;
--   ALTER TABLE public.organizations ADD CONSTRAINT organizations_status_check
--     CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended'));
-- ============================================================================

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_status_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_status_check
  CHECK (status IN (
    'active',
    'trialing',
    'past_due',
    'canceled',
    'suspended',
    'pending_approval'
  ));

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.admin_users.phone IS
  'Owner contact phone (normalized digits). Collected at self-service signup.';

CREATE INDEX IF NOT EXISTS idx_organizations_pending_approval
  ON public.organizations (created_at DESC)
  WHERE status = 'pending_approval';
