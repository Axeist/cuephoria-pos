-- Add entry_fee and discount_coupons to tournaments table
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS entry_fee NUMERIC DEFAULT 250,
ADD COLUMN IF NOT EXISTS discount_coupons JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the discount_coupons structure
COMMENT ON COLUMN tournaments.discount_coupons IS 'Array of discount coupons: [{"code": "SAVE20", "discount_percentage": 20, "description": "20% off"}]';

-- Update the tournament_public_view to include entry_fee
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
  t.winner,
  t.runner_up,
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

-- Add coupon_code and discount_amount to tournament_public_registrations
ALTER TABLE tournament_public_registrations
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS original_fee NUMERIC,
ADD COLUMN IF NOT EXISTS final_fee NUMERIC;

-- Add comment
COMMENT ON COLUMN tournament_public_registrations.coupon_code IS 'Coupon code applied during registration';
COMMENT ON COLUMN tournament_public_registrations.discount_percentage IS 'Percentage discount applied';
COMMENT ON COLUMN tournament_public_registrations.original_fee IS 'Original entry fee before discount';
COMMENT ON COLUMN tournament_public_registrations.final_fee IS 'Final fee after discount';
