
-- Update the existing "Cuephoria PS5 League" tournament to have max_players = 8
UPDATE public.tournaments 
SET max_players = 8
WHERE name = 'Cuephoria PS5 League';

-- Also update any other tournaments that might not have the max_players set correctly
-- (this ensures all existing tournaments have a max_players value)
UPDATE public.tournaments 
SET max_players = COALESCE(max_players, 16)
WHERE max_players IS NULL;
