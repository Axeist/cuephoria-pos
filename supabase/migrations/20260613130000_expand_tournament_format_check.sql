-- Allow new tournament formats (FIFA time trial, Swiss, etc.)
-- Does not widen tournament_format — longest value is double_elimination (18), fits VARCHAR(20).
-- Avoids DROP/RECREATE tournament_public_view (view depends on tournament_format column type).
--
-- Rollback:
--   ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS check_tournament_format;
--   ALTER TABLE public.tournaments ADD CONSTRAINT check_tournament_format
--     CHECK (tournament_format IN ('knockout', 'league'));

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS check_tournament_format;

ALTER TABLE public.tournaments
  ADD CONSTRAINT check_tournament_format
  CHECK (tournament_format IN (
    'knockout',
    'league',
    'double_elimination',
    'round_robin',
    'swiss',
    'custom',
    'time_trial'
  ));
