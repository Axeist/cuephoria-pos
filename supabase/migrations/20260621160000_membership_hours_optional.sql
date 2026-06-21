-- Included playtime hours are optional per tier (not all membership types grant hours).
ALTER TABLE public.membership_tiers
  ALTER COLUMN default_membership_hours DROP NOT NULL,
  ALTER COLUMN default_membership_hours DROP DEFAULT;

COMMENT ON COLUMN public.membership_tiers.default_membership_hours IS
  'Optional included playtime hours granted on purchase; NULL = tier does not include hours';
