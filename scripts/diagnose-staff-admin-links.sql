-- Why is admin_user_id still NULL? Run these in Supabase SQL editor.

-- 1) Staff profiles waiting for a login link
SELECT user_id, username, full_name, email, admin_user_id, portal_pin, created_at
FROM public.staff_profiles
ORDER BY admin_user_id NULLS FIRST, username;

-- 2) Staff login accounts (non-admin) that could be linked
SELECT id, username, email, display_name, designation, is_admin, is_super_admin, created_at
FROM public.admin_users
WHERE is_admin = false
  AND is_super_admin = false
  AND COALESCE(is_platform_backdoor, false) = false
ORDER BY COALESCE(display_name, username);

-- 3) Possible matches the backfill would consider (empty = nothing to link)
SELECT
  sp.username AS profile_username,
  sp.email AS profile_email,
  au.username AS login_username,
  au.email AS login_email,
  au.display_name AS login_display_name,
  CASE
    WHEN sp.email IS NOT NULL AND btrim(sp.email) <> ''
         AND lower(btrim(sp.email)) = lower(btrim(COALESCE(au.email, ''))) THEN 'email'
    WHEN lower(btrim(sp.username)) = lower(btrim(COALESCE(au.username, ''))) THEN 'username'
    WHEN lower(btrim(sp.username)) = lower(btrim(COALESCE(au.display_name, ''))) THEN 'display_name'
    WHEN au.email IS NOT NULL
         AND lower(btrim(sp.username)) = lower(split_part(btrim(au.email), '@', 1)) THEN 'email_local_part'
    ELSE 'other'
  END AS match_type
FROM public.staff_profiles sp
INNER JOIN public.admin_users au
  ON au.is_admin = false
 AND au.is_super_admin = false
 AND COALESCE(au.is_platform_backdoor, false) = false
 AND sp.admin_user_id IS NULL
 AND NOT EXISTS (SELECT 1 FROM public.staff_profiles sp2 WHERE sp2.admin_user_id = au.id)
 AND (
   (sp.email IS NOT NULL AND btrim(sp.email) <> '' AND lower(btrim(sp.email)) = lower(btrim(COALESCE(au.email, ''))))
   OR lower(btrim(sp.username)) = lower(btrim(COALESCE(au.username, '')))
   OR lower(btrim(sp.username)) = lower(btrim(COALESCE(au.display_name, '')))
   OR (au.email IS NOT NULL AND lower(btrim(sp.username)) = lower(split_part(btrim(au.email), '@', 1)))
   OR (sp.full_name IS NOT NULL AND btrim(sp.full_name) <> ''
       AND lower(btrim(sp.full_name)) = lower(btrim(COALESCE(au.display_name, ''))))
 )
ORDER BY sp.username, au.email;
