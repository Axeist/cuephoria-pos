-- Fix VR station pricing
-- VR stations should be ₹150 for 15 minutes (not ₹600)
-- The hourly_rate field for VR stations represents the 15-minute rate

UPDATE public.stations
SET hourly_rate = 150
WHERE type = 'vr' AND hourly_rate = 600;

-- Verify the update
SELECT id, name, type, hourly_rate 
FROM public.stations 
WHERE type = 'vr';
