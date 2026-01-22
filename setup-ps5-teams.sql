-- =====================================================
-- PS5 Team Setup Script
-- Run this in Supabase SQL Editor to configure your PS5 controllers
-- =====================================================

-- First, let's see what PS5 stations you have
SELECT id, name, type, hourly_rate, team_name, single_rate
FROM public.stations 
WHERE type = 'ps5'
ORDER BY name;

-- =====================================================
-- TEAM RED: Controllers 1-4
-- =====================================================
-- Update this query based on your actual controller names
-- Common patterns: "PS5 Controller 1", "Controller 1", "PS5 1", etc.

UPDATE public.stations 
SET 
  team_name = 'TEAM RED', 
  team_color = 'red',
  single_rate = 200,
  max_capacity = 4,
  hourly_rate = 150  -- Regular rate for multiple controllers
WHERE type = 'ps5' 
  AND (
    name ILIKE '%controller 1%' OR
    name ILIKE '%controller 2%' OR
    name ILIKE '%controller 3%' OR
    name ILIKE '%controller 4%' OR
    name ~ 'PS5.*(1|2|3|4)' OR
    name ~ 'Controller.*(1|2|3|4)'
  );

-- =====================================================
-- TEAM BLUE: Controllers 5-8
-- =====================================================

UPDATE public.stations 
SET 
  team_name = 'TEAM BLUE', 
  team_color = 'blue',
  single_rate = 200,
  max_capacity = 4,
  hourly_rate = 150  -- Regular rate for multiple controllers
WHERE type = 'ps5' 
  AND (
    name ILIKE '%controller 5%' OR
    name ILIKE '%controller 6%' OR
    name ILIKE '%controller 7%' OR
    name ILIKE '%controller 8%' OR
    name ~ 'PS5.*(5|6|7|8)' OR
    name ~ 'Controller.*(5|6|7|8)'
  );

-- =====================================================
-- Verify the updates
-- =====================================================

SELECT 
  id, 
  name, 
  type, 
  team_name,
  team_color,
  hourly_rate as regular_rate,
  single_rate,
  max_capacity
FROM public.stations 
WHERE type = 'ps5'
ORDER BY team_name, name;

-- =====================================================
-- Expected Result:
-- =====================================================
-- TEAM RED controllers (1-4):
--   - hourly_rate: 150 (when booking multiple)
--   - single_rate: 200 (when booking just one)
--   - team_color: red
--
-- TEAM BLUE controllers (5-8):
--   - hourly_rate: 150 (when booking multiple)
--   - single_rate: 200 (when booking just one)
--   - team_color: blue
-- =====================================================

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- If you need to undo these changes:
/*
UPDATE public.stations 
SET 
  team_name = NULL,
  team_color = NULL,
  single_rate = NULL,
  max_capacity = 1
WHERE type = 'ps5';
*/
