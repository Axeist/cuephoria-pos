-- Manual one-time backfill (same logic as migration 20260804130000).
-- Run in Supabase SQL editor if you need to re-link after fixing emails.
-- Safe to re-run: only updates staff_profiles where admin_user_id IS NULL.

-- Linking staff_profiles → admin_users by email/username…

WITH candidates AS (
  SELECT
    sp.user_id AS staff_user_id,
    au.id AS admin_user_id,
    ROW_NUMBER() OVER (
      PARTITION BY au.id
      ORDER BY sp.created_at ASC NULLS LAST, sp.user_id
    ) AS rn_admin,
    ROW_NUMBER() OVER (
      PARTITION BY sp.user_id
      ORDER BY au.created_at ASC NULLS LAST, au.id
    ) AS rn_staff
  FROM public.staff_profiles sp
  INNER JOIN public.admin_users au
    ON au.is_admin = false
   AND au.is_super_admin = false
   AND COALESCE(au.is_platform_backdoor, false) = false
   AND (
     (
       sp.email IS NOT NULL
       AND btrim(sp.email) <> ''
       AND lower(btrim(sp.email)) = lower(btrim(COALESCE(au.email, '')))
     )
     OR (
       sp.email IS NULL
       AND lower(btrim(sp.username)) = lower(btrim(COALESCE(au.email, au.username, '')))
     )
     OR lower(btrim(sp.username)) = lower(btrim(COALESCE(au.username, '')))
   )
  WHERE sp.admin_user_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.staff_profiles sp2
      WHERE sp2.admin_user_id = au.id
    )
),
picked AS (
  SELECT staff_user_id, admin_user_id
  FROM candidates
  WHERE rn_admin = 1
    AND rn_staff = 1
)
UPDATE public.staff_profiles sp
SET
  admin_user_id = p.admin_user_id,
  portal_pin = COALESCE(
    NULLIF(btrim(sp.portal_pin), ''),
    lpad((floor(random() * 900000 + 100000))::text, 6, '0')
  ),
  updated_at = now()
FROM picked p
WHERE sp.user_id = p.staff_user_id
  AND sp.admin_user_id IS NULL;

UPDATE public.staff_profiles sp
SET
  full_name = COALESCE(NULLIF(btrim(sp.full_name), ''), au.display_name, au.username),
  designation = COALESCE(NULLIF(btrim(sp.designation), ''), au.designation, sp.designation),
  email = COALESCE(NULLIF(btrim(sp.email), ''), lower(btrim(au.email))),
  updated_at = now()
FROM public.admin_users au
WHERE sp.admin_user_id = au.id
  AND (
    sp.full_name IS NULL OR btrim(sp.full_name) = ''
    OR sp.designation IS NULL OR btrim(sp.designation) = ''
    OR sp.email IS NULL OR btrim(sp.email) = ''
  );

-- Review unlinked rows after running:
SELECT user_id, username, email, admin_user_id, portal_pin
FROM public.staff_profiles
ORDER BY admin_user_id NULLS FIRST, username;
