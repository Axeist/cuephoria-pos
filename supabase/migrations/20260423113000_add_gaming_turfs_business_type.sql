-- Allow the new onboarding option "gaming_turfs" on organizations.business_type.
-- Existing environments may already have organizations_business_type_check
-- without this value, which causes onboarding Step 3 save failures.

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_business_type_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_business_type_check
  CHECK (
    business_type IS NULL
    OR business_type IN (
      'gaming_lounge',
      'gaming_turfs',
      'cafe',
      'arcade',
      'club',
      'billiards',
      'bowling',
      'other'
    )
  );

