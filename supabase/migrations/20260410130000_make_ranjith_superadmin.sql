-- Make Ranjith a Super Admin with access to all active branches.

UPDATE public.admin_users
SET is_super_admin = true
WHERE LOWER(username) = LOWER('Ranjith');

-- Ensure they have rows in admin_user_locations for every active location.
INSERT INTO public.admin_user_locations (admin_user_id, location_id)
SELECT au.id, loc.id
FROM public.admin_users au
CROSS JOIN public.locations loc
WHERE LOWER(au.username) = LOWER('Ranjith')
  AND loc.is_active = true
ON CONFLICT DO NOTHING;
