-- Fix tournament_public_view to count players from the players array
-- This ensures manually added players are included in the count
DROP VIEW IF EXISTS public.tournament_public_view;

CREATE VIEW public.tournament_public_view AS
SELECT 
  t.id,
  t.name,
  t.game_type,
  t.game_variant,
  t.game_title,
  t.date,
  t.status,
  t.budget,
  t.winner_prize,
  t.runner_up_prize,
  t.players,
  t.matches,
  t.winner,
  t.runner_up,
  -- Count players from the players JSONB array (includes both manually added and online registered)
  -- This ensures manually added players are reflected in the public view
  COALESCE(jsonb_array_length(t.players), 0) as total_registrations,
  t.max_players
FROM tournaments t
WHERE t.status IN ('upcoming', 'in-progress', 'completed')
ORDER BY 
  CASE 
    WHEN t.status = 'upcoming' THEN 1
    WHEN t.status = 'in-progress' THEN 2
    WHEN t.status = 'completed' THEN 3
  END,
  t.date ASC;

-- Grant necessary permissions
GRANT SELECT ON public.tournament_public_view TO anon, authenticated;

