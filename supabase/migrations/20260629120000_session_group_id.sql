-- Links sessions started together in a group start (batch end / combined POS checkout)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS session_group_id uuid;

COMMENT ON COLUMN public.sessions.session_group_id IS
  'Shared id for sessions started together via group start on the Stations page';

CREATE INDEX IF NOT EXISTS idx_sessions_session_group_id
  ON public.sessions (session_group_id)
  WHERE session_group_id IS NOT NULL AND end_time IS NULL;
