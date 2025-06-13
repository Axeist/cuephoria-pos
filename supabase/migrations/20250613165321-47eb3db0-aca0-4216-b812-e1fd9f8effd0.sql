
-- Drop the existing view first
DROP VIEW IF EXISTS public.tournament_public_view;

-- Recreate the tournament_public_view with the runner_up field included
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
  COALESCE(reg_count.total_registrations, 0) as total_registrations,
  t.max_players
FROM tournaments t
LEFT JOIN (
  SELECT 
    tournament_id,
    COUNT(*) as total_registrations
  FROM tournament_public_registrations 
  WHERE status = 'registered'
  GROUP BY tournament_id
) reg_count ON t.id = reg_count.tournament_id
WHERE t.status IN ('upcoming', 'in-progress', 'completed')
ORDER BY 
  CASE 
    WHEN t.status = 'upcoming' THEN 1
    WHEN t.status = 'in-progress' THEN 2
    WHEN t.status = 'completed' THEN 3
  END,
  t.date ASC;
