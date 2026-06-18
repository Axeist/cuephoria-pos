-- Ensure category column exists (in case previous migration wasn't run)
ALTER TABLE public.stations 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add event_enabled and slot_duration fields to stations table for NIT EVENT functionality
ALTER TABLE public.stations 
ADD COLUMN IF NOT EXISTS event_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.stations 
ADD COLUMN IF NOT EXISTS slot_duration INTEGER DEFAULT 60;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stations_category ON public.stations(category);
CREATE INDEX IF NOT EXISTS idx_stations_event_enabled ON public.stations(event_enabled);

-- Add comments to explain the fields
COMMENT ON COLUMN public.stations.category IS 'Category for grouping stations (e.g., "nit_event"). When set, affects slot duration: 30 min for 8ball/ps5, 15 min for vr';
COMMENT ON COLUMN public.stations.event_enabled IS 'When true, station is visible on public booking page. Only applies to stations with category set.';
COMMENT ON COLUMN public.stations.slot_duration IS 'Slot duration in minutes. Default 60, but 30 for event stations (except VR which is 15)';

-- Update existing stations: set slot_duration based on type
-- VR stations get 15 minutes, others get 60 minutes by default
-- Event stations (with category set) will be updated when they are created
UPDATE public.stations 
SET slot_duration = CASE 
  WHEN type = 'vr' THEN 15
  ELSE 60
END
WHERE slot_duration IS NULL OR slot_duration = 60;
