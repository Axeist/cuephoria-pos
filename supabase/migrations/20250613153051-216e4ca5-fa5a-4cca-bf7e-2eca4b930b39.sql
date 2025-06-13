
-- Add max_players column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN max_players INTEGER DEFAULT 16;

-- Update existing tournaments to have a default max_players value
UPDATE public.tournaments 
SET max_players = 16 
WHERE max_players IS NULL;
