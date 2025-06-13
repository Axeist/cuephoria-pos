
-- First, let's check the current tournaments table structure and see what's happening with max_players
SELECT name, max_players, players FROM tournaments;

-- Also check if there are any constraints or defaults that might be interfering
SELECT column_name, column_default, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'tournaments' AND column_name = 'max_players';
