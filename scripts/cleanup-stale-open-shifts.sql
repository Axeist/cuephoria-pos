-- One-time cleanup: close open attendance rows from before today.
-- Run in Supabase SQL editor. Review the SELECT first, then uncomment UPDATE.

-- Preview stale open rows (orphan profiles show null names):
-- SELECT sa.id, sa.staff_id, sp.full_name, sp.username, sa.clock_in, sa.date
-- FROM staff_attendance sa
-- LEFT JOIN staff_profiles sp ON sp.user_id = sa.staff_id
-- WHERE sa.clock_out IS NULL
--   AND sa.date < CURRENT_DATE
-- ORDER BY sa.clock_in DESC;

UPDATE staff_attendance
SET
  clock_out = COALESCE(clock_out, clock_in, NOW()),
  status = 'completed'
WHERE clock_out IS NULL
  AND date < CURRENT_DATE;
