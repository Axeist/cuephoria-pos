-- Reference: moving tenant admins to Google Workspace (@cuetronix.com)
-- =============================================================
-- Google OAuth matches `admin_users.email` to the Google account email
-- (see /api/auth/google/callback). After you issue Workspace mailboxes:
--
-- 1) Update the row to the new address (run in SQL editor, one row at a time
--    or with a vetted mapping), e.g.:
--
--     UPDATE public.admin_users
--     SET email = lower('firstname.lastname@cuetronix.com')
--     WHERE id = '<uuid>';
--
-- 2) Have the user sign in with Google using that Workspace account. The
--    callback will set `google_sub` on first successful login if missing.
--
-- Do not bulk-change emails without confirming each person’s Workspace login;
-- otherwise they can be locked out until corrected.

SELECT 1;
