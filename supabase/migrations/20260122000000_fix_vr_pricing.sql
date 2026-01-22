-- Fix VR station pricing
-- VR stations should be ₹150 for 15 minutes (not ₹600)
-- The hourly_rate field for VR stations represents the 15-minute rate

UPDATE public.stations
SET hourly_rate = 150
WHERE type = 'vr' AND hourly_rate = 600;

-- Add a comment to document VR pricing
COMMENT ON COLUMN public.stations.hourly_rate IS 'Hourly rate for PS5 and 8-Ball stations. For VR stations, this represents the 15-minute rate.';
