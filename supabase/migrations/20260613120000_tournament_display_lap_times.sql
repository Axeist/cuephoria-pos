-- Tournament display config, format options, and FIFA lap times (additive)

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS display_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS format_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lap_times jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tournaments.display_config IS 'UI/TV display toggles and animation intensity';
COMMENT ON COLUMN public.tournaments.format_options IS 'Format-specific options (Swiss rounds, track name, etc.)';
COMMENT ON COLUMN public.tournaments.lap_times IS 'FIFA/time trial lap entries [{playerId, lapTimeMs, ...}]';

-- Extend tournament_public_view to expose new columns for public pages
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
  t.third_prize,
  t.winner_prize_text,
  t.runner_up_prize_text,
  t.third_prize_text,
  t.players,
  t.matches,
  t.winner,
  t.runner_up,
  t.third_place,
  t.max_players,
  t.tournament_format,
  t.entry_fee,
  t.discount_coupons,
  t.location_id,
  t.display_config,
  t.format_options,
  t.lap_times,
  COALESCE(reg.cnt, 0)::int AS total_registrations
FROM public.tournaments t
LEFT JOIN (
  SELECT tournament_id, COUNT(*) AS cnt
  FROM public.tournament_public_registrations
  WHERE status = 'registered'
  GROUP BY tournament_id
) reg ON reg.tournament_id = t.id
WHERE t.status <> 'archived';

GRANT SELECT ON public.tournament_public_view TO anon, authenticated;

-- Realtime for TV mode live updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
END $$;
