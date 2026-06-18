-- Add is_super_admin column to admin_users.
-- Super admins can see and switch between ALL branches.
-- Regular admins/staff are scoped to their assigned branches only.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Existing admins inherit super-admin status so nothing breaks.
UPDATE public.admin_users
SET is_super_admin = true
WHERE is_admin = true;

-- Ensure admin_user_locations exists (idempotent - was created in 20260409120000).
CREATE TABLE IF NOT EXISTS public.admin_user_locations (
  admin_user_id UUID NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  location_id   UUID NOT NULL REFERENCES public.locations (id)  ON DELETE CASCADE,
  PRIMARY KEY (admin_user_id, location_id)
);

-- Back-fill: super admins get access to every location.
INSERT INTO public.admin_user_locations (admin_user_id, location_id)
SELECT au.id, loc.id
FROM public.admin_users au
CROSS JOIN public.locations loc
WHERE au.is_super_admin = true
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN public.admin_users.is_super_admin
  IS 'Super admins can view and switch between all branches. Regular admins are limited to their assigned branch(es).';
