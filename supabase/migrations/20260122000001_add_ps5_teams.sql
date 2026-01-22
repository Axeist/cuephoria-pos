-- Add PS5 team grouping support
-- This allows grouping PS5 controllers into teams (TEAM RED, TEAM BLUE, etc.)
-- and supports dynamic pricing based on controller count

-- Add team/group field to stations table
ALTER TABLE public.stations 
ADD COLUMN IF NOT EXISTS team_name TEXT,
ADD COLUMN IF NOT EXISTS team_color TEXT,
ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS single_rate NUMERIC; -- Special rate for booking single controller

-- Add comments to document the new fields
COMMENT ON COLUMN public.stations.team_name IS 'Team name for grouped stations (e.g., "TEAM RED", "TEAM BLUE"). Used for PS5 controllers that share the same console.';
COMMENT ON COLUMN public.stations.team_color IS 'Color code for team visualization (e.g., "red", "blue")';
COMMENT ON COLUMN public.stations.max_capacity IS 'Maximum players/controllers for this station. Default is 1.';
COMMENT ON COLUMN public.stations.single_rate IS 'Special hourly rate when booking single controller. If NULL, uses standard hourly_rate.';

-- Create index for faster team queries
CREATE INDEX IF NOT EXISTS idx_stations_team ON public.stations(team_name) WHERE team_name IS NOT NULL;

-- Example: Update existing PS5 controllers to be part of teams
-- Assuming you have PS5 Controller 1-4 for TEAM RED and 5-8 for TEAM BLUE
-- You'll need to adjust these IDs based on your actual station IDs

-- Note: Run this part manually after checking your actual station names/IDs
-- UPDATE public.stations 
-- SET team_name = 'TEAM RED', 
--     team_color = 'red',
--     single_rate = 200,
--     max_capacity = 4
-- WHERE type = 'ps5' AND name SIMILAR TO '%(Controller [1-4]|1|2|3|4)%';

-- UPDATE public.stations 
-- SET team_name = 'TEAM BLUE', 
--     team_color = 'blue',
--     single_rate = 200,
--     max_capacity = 4
-- WHERE type = 'ps5' AND name SIMILAR TO '%(Controller [5-8]|5|6|7|8)%';
