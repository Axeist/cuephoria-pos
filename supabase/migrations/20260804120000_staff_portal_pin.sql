-- Link login accounts (admin_users) to HR profiles (staff_profiles) and store
-- a staff-portal PIN that owners/admins can view and staff enter at /staff-portal.

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS admin_user_id UUID UNIQUE
    REFERENCES public.admin_users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_pin VARCHAR(8);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_admin_user_id
  ON public.staff_profiles (admin_user_id)
  WHERE admin_user_id IS NOT NULL;

COMMENT ON COLUMN public.staff_profiles.admin_user_id
  IS 'Login account linked to this HR profile. One staff profile per admin_users row.';
COMMENT ON COLUMN public.staff_profiles.portal_pin
  IS '6-digit PIN for /staff-portal access. Visible to workspace admins; verified server-side.';
