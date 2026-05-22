-- Pause/resume support for gaming station sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_paused_time bigint DEFAULT 0;

COMMENT ON COLUMN public.sessions.is_paused IS 'Whether the session timer is currently paused';
COMMENT ON COLUMN public.sessions.paused_at IS 'When the current pause started';
COMMENT ON COLUMN public.sessions.total_paused_time IS 'Accumulated paused milliseconds (excludes current pause until resume/end)';
