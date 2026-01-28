-- Add category column to stations table for NIT EVENT and other categories
ALTER TABLE public.stations 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stations_category ON public.stations(category);

-- Add comment to explain the category field
COMMENT ON COLUMN public.stations.category IS 'Category for grouping stations (e.g., "nit_event"). When set, affects slot duration: 30 min for 8ball/ps5, 15 min for vr';
