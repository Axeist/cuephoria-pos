-- =====================================================
-- Delete Tournament Players Created in November
-- =====================================================

-- Option 1: Delete from tournament_public_registrations table
-- This deletes registrations created in November (any year)
DELETE FROM public.tournament_public_registrations
WHERE EXTRACT(MONTH FROM registration_date) = 11;

-- Option 2: Delete from tournament_public_registrations for November 2024 specifically
DELETE FROM public.tournament_public_registrations
WHERE EXTRACT(YEAR FROM registration_date) = 2024
  AND EXTRACT(MONTH FROM registration_date) = 11;

-- Option 3: Delete from tournament_public_registrations for November 2025 specifically
DELETE FROM public.tournament_public_registrations
WHERE EXTRACT(YEAR FROM registration_date) = 2025
  AND EXTRACT(MONTH FROM registration_date) = 11;

-- Option 4: Delete from tournament_public_registrations for a specific date range
-- (November 1, 2024 to November 30, 2024)
DELETE FROM public.tournament_public_registrations
WHERE registration_date >= '2024-11-01 00:00:00+00'
  AND registration_date < '2024-12-01 00:00:00+00';

-- =====================================================
-- Clear players array from tournaments in November
-- =====================================================

-- Option 5: Clear players array from tournaments that are scheduled in November
-- This updates tournaments where the tournament date is in November
UPDATE public.tournaments
SET 
  players = '[]'::jsonb,
  updated_at = now()
WHERE EXTRACT(MONTH FROM date) = 11;

-- Option 6: Clear players array from tournaments in November 2024 specifically
UPDATE public.tournaments
SET 
  players = '[]'::jsonb,
  updated_at = now()
WHERE EXTRACT(YEAR FROM date) = 2024
  AND EXTRACT(MONTH FROM date) = 11;

-- Option 7: Clear players array from tournaments in November 2025 specifically
UPDATE public.tournaments
SET 
  players = '[]'::jsonb,
  updated_at = now()
WHERE EXTRACT(YEAR FROM date) = 2025
  AND EXTRACT(MONTH FROM date) = 11;

-- =====================================================
-- Preview/Check before deleting (SAFE - Read Only)
-- =====================================================

-- Preview registrations that will be deleted (November, any year)
SELECT 
  id,
  tournament_id,
  customer_name,
  customer_phone,
  registration_date,
  status
FROM public.tournament_public_registrations
WHERE EXTRACT(MONTH FROM registration_date) = 11
ORDER BY registration_date DESC;

-- Preview tournaments that will be affected (November, any year)
SELECT 
  id,
  name,
  date,
  jsonb_array_length(players) as player_count,
  players
FROM public.tournaments
WHERE EXTRACT(MONTH FROM date) = 11
ORDER BY date DESC;

-- Count how many registrations will be deleted
SELECT COUNT(*) as total_registrations_to_delete
FROM public.tournament_public_registrations
WHERE EXTRACT(MONTH FROM registration_date) = 11;

-- Count how many tournaments will be affected
SELECT COUNT(*) as total_tournaments_to_update
FROM public.tournaments
WHERE EXTRACT(MONTH FROM date) = 11;

