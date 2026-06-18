-- Add 3rd prize field and text-based prize support to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS third_prize NUMERIC,
ADD COLUMN IF NOT EXISTS winner_prize_text TEXT,
ADD COLUMN IF NOT EXISTS runner_up_prize_text TEXT,
ADD COLUMN IF NOT EXISTS third_prize_text TEXT;

-- Add comments explaining the prize fields
COMMENT ON COLUMN tournaments.third_prize IS 'Third place prize amount (optional)';
COMMENT ON COLUMN tournaments.winner_prize_text IS 'Text description for winner prize (e.g., "Free gold membership", "500 store credits")';
COMMENT ON COLUMN tournaments.runner_up_prize_text IS 'Text description for runner-up prize';
COMMENT ON COLUMN tournaments.third_prize_text IS 'Text description for third prize';

-- Add 3rd place winner field
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS third_place JSONB;

COMMENT ON COLUMN tournaments.third_place IS 'Third place winner player object: {"id": "...", "name": "...", "customerId": "..."}';

-- Update the tournament_public_view to include new prize fields
DROP VIEW IF EXISTS tournament_public_view;

CREATE VIEW tournament_public_view AS
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
  t.third_prize,
  t.winner_prize_text,
  t.runner_up_prize_text,
  t.third_prize_text,
  t.winner,
  t.runner_up,
  t.third_place,
  t.max_players,
  t.tournament_format,
  t.entry_fee,
  t.discount_coupons,
  t.players,
  t.matches,
  COALESCE(
    (SELECT COUNT(*) FROM tournament_public_registrations WHERE tournament_id = t.id),
    0
  ) AS total_registrations
FROM tournaments t;

-- Grant access to the view
GRANT SELECT ON tournament_public_view TO anon, authenticated;
