
-- Create a view for public tournament data that shows only necessary information
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
  -- Set max players based on game type and current players
  CASE 
    WHEN t.game_type = 'Pool' THEN 8
    WHEN t.game_type = 'PS5' THEN 16
    ELSE 8
  END as max_players
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

-- Enable RLS on tournament_public_registrations if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'tournament_public_registrations' 
    AND n.nspname = 'public' 
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.tournament_public_registrations ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow public read access to tournament registrations" ON public.tournament_public_registrations;
DROP POLICY IF EXISTS "Allow public insert for tournament registrations" ON public.tournament_public_registrations;

-- Create policies for tournament_public_registrations
CREATE POLICY "Allow public read access to tournament registrations" 
ON public.tournament_public_registrations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert for tournament registrations" 
ON public.tournament_public_registrations 
FOR INSERT 
WITH CHECK (true);

-- Grant necessary permissions for the view
GRANT SELECT ON public.tournament_public_view TO anon, authenticated;
GRANT SELECT ON public.tournament_public_registrations TO anon, authenticated;
GRANT INSERT ON public.tournament_public_registrations TO anon, authenticated;
