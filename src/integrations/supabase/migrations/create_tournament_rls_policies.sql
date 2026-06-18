
-- Enable RLS on tournament_history table if not already enabled
ALTER TABLE tournament_history ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tournament_winners table if not already enabled  
ALTER TABLE tournament_winners ENABLE ROW LEVEL SECURITY;

-- Allow all operations on tournament_history for authenticated users
CREATE POLICY "Allow full access to tournament_history for authenticated users" 
ON tournament_history FOR ALL USING (true);

-- Allow all operations on tournament_winners for authenticated users
CREATE POLICY "Allow full access to tournament_winners for authenticated users" 
ON tournament_winners FOR ALL USING (true);

-- Allow read access to tournament_history for anonymous users (for public leaderboard)
CREATE POLICY "Allow read access to tournament_history for anonymous users" 
ON tournament_history FOR SELECT USING (true);

-- Allow read access to tournament_winners for anonymous users (for public leaderboard)
CREATE POLICY "Allow read access to tournament_winners for anonymous users" 
ON tournament_winners FOR SELECT USING (true);
