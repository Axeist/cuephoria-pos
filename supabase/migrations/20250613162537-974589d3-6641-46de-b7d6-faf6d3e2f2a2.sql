
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to tournament_history for authenticated users" ON tournament_history;
DROP POLICY IF EXISTS "Allow full access to tournament_winners for authenticated users" ON tournament_winners;
DROP POLICY IF EXISTS "Allow read access to tournament_history for anonymous users" ON tournament_history;
DROP POLICY IF EXISTS "Allow read access to tournament_winners for anonymous users" ON tournament_winners;

-- Create new policies that allow all operations for all users (authenticated and anonymous)
CREATE POLICY "Allow all operations on tournament_history" 
ON tournament_history FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tournament_winners" 
ON tournament_winners FOR ALL USING (true) WITH CHECK (true);
