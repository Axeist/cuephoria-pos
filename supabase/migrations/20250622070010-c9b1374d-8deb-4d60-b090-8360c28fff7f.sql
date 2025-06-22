
-- Add tournament_format column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tournament_format VARCHAR(20) NOT NULL DEFAULT 'knockout';

-- Add a check constraint to ensure valid tournament formats
ALTER TABLE public.tournaments 
ADD CONSTRAINT check_tournament_format 
CHECK (tournament_format IN ('knockout', 'league'));

-- Update existing tournaments to have knockout format by default
UPDATE public.tournaments 
SET tournament_format = 'knockout' 
WHERE tournament_format IS NULL;
