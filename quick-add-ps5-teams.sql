-- Quick script to add TEAM RED and TEAM BLUE to your PS5 controllers
-- Run this in Supabase SQL Editor

-- First, let's see what PS5 stations you have
SELECT id, name, type, hourly_rate, team_name 
FROM public.stations 
WHERE type = 'ps5'
ORDER BY name;

-- =====================================================
-- UPDATE YOUR PS5 CONTROLLERS
-- Adjust the names below to match YOUR actual station names!
-- =====================================================

-- Example: If your PS5 controllers are named exactly like this:
-- UPDATE public.stations 
-- SET team_name = 'TEAM RED', team_color = 'red', single_rate = 200, hourly_rate = 150
-- WHERE name IN ('PS5 Controller 1', 'PS5 Controller 2', 'PS5 Controller 3', 'PS5 Controller 4');

-- UPDATE public.stations 
-- SET team_name = 'TEAM BLUE', team_color = 'blue', single_rate = 200, hourly_rate = 150
-- WHERE name IN ('PS5 Controller 5', 'PS5 Controller 6', 'PS5 Controller 7', 'PS5 Controller 8');

-- =====================================================
-- OR use pattern matching if your names follow a pattern:
-- =====================================================

-- For names containing "1", "2", "3", "4" → TEAM RED
UPDATE public.stations 
SET 
  team_name = 'TEAM RED', 
  team_color = 'red',
  single_rate = 200,
  hourly_rate = 150
WHERE type = 'ps5' 
  AND (
    name ILIKE '%1%' AND name NOT ILIKE '%10%' AND name NOT ILIKE '%11%' AND name NOT ILIKE '%12%'
    OR name ILIKE '%2%'
    OR name ILIKE '%3%'
    OR name ILIKE '%4%'
  )
  AND team_name IS NULL; -- Only update if not already set

-- For names containing "5", "6", "7", "8" → TEAM BLUE
UPDATE public.stations 
SET 
  team_name = 'TEAM BLUE', 
  team_color = 'blue',
  single_rate = 200,
  hourly_rate = 150
WHERE type = 'ps5' 
  AND (
    name ILIKE '%5%'
    OR name ILIKE '%6%'
    OR name ILIKE '%7%'
    OR name ILIKE '%8%'
  )
  AND team_name IS NULL; -- Only update if not already set

-- =====================================================
-- Verify the changes
-- =====================================================
SELECT 
  name, 
  type,
  team_name,
  team_color,
  hourly_rate,
  single_rate
FROM public.stations 
WHERE type = 'ps5'
ORDER BY team_name, name;

-- Expected result:
-- You should see:
-- - TEAM RED controllers with red color
-- - TEAM BLUE controllers with blue color
-- - hourly_rate = 150
-- - single_rate = 200
