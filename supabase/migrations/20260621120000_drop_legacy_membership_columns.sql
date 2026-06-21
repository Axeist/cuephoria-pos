-- Drop legacy membership columns (Phase 6)
-- Rollback:
--   ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_member boolean NOT NULL DEFAULT false;
--   ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS membership_plan text;
--   ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS membership_seconds_left integer;

ALTER TABLE public.customers DROP COLUMN IF EXISTS is_member;
ALTER TABLE public.customers DROP COLUMN IF EXISTS membership_plan;
ALTER TABLE public.customers DROP COLUMN IF EXISTS membership_seconds_left;
