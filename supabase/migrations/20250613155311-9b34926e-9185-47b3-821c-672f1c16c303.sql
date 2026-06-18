
-- Add runner_up field to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS runner_up jsonb;

-- Create tournament_history table to track detailed match results
CREATE TABLE IF NOT EXISTS public.tournament_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL,
  match_id text NOT NULL,
  player1_name text NOT NULL,
  player2_name text NOT NULL,
  winner_name text NOT NULL,
  match_date date NOT NULL,
  match_stage text NOT NULL, -- 'regular', 'quarter_final', 'semi_final', 'final'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tournament_winners table for leaderboard
CREATE TABLE IF NOT EXISTS public.tournament_winners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL,
  tournament_name text NOT NULL,
  winner_name text NOT NULL,
  runner_up_name text,
  tournament_date date NOT NULL,
  game_type text NOT NULL,
  game_variant text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_history_tournament_id ON public.tournament_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_history_match_date ON public.tournament_history(match_date);
CREATE INDEX IF NOT EXISTS idx_tournament_winners_winner_name ON public.tournament_winners(winner_name);
CREATE INDEX IF NOT EXISTS idx_tournament_winners_tournament_date ON public.tournament_winners(tournament_date);

-- Enable RLS on new tables
ALTER TABLE public.tournament_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tournament_history (read-only for public)
CREATE POLICY "Anyone can view tournament history" ON public.tournament_history
  FOR SELECT USING (true);

-- Create RLS policies for tournament_winners (read-only for public)
CREATE POLICY "Anyone can view tournament winners" ON public.tournament_winners
  FOR SELECT USING (true);
