
-- Create a view that combines tournament data with registration counts for public display
CREATE OR REPLACE VIEW public.tournament_public_view AS
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
  COALESCE(reg_count.total_registrations, 0) as total_registrations,
  CASE 
    WHEN t.game_type = 'Pool' THEN 16
    WHEN t.game_type = 'PS5' THEN 32
    ELSE 16
  END as max_players
FROM public.tournaments t
LEFT JOIN (
  SELECT 
    tournament_id,
    COUNT(*) as total_registrations
  FROM public.tournament_public_registrations
  WHERE status = 'registered'
  GROUP BY tournament_id
) reg_count ON t.id = reg_count.tournament_id
WHERE t.status IN ('upcoming', 'in-progress');

-- Enable RLS on tournament_public_registrations table
ALTER TABLE public.tournament_public_registrations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to registrations
CREATE POLICY "Allow public read access to tournament registrations" 
ON public.tournament_public_registrations 
FOR SELECT 
USING (true);

-- Create policy to allow public insert for new registrations
CREATE POLICY "Allow public insert for tournament registrations" 
ON public.tournament_public_registrations 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for tournament registrations
ALTER TABLE public.tournament_public_registrations REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.tournament_public_registrations;

-- Enable realtime for tournaments table
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.tournaments;
