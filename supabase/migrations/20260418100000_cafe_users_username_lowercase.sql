-- Normalize cafe login usernames to lowercase (matches app insert + /api/cafe/login).

UPDATE public.cafe_users SET username = lower(btrim(username)) WHERE username IS NOT NULL;
