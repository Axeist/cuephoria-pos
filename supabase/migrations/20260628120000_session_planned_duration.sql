-- Preset play duration for walk-in station sessions (countdown + extend UX)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS planned_duration_minutes integer;

COMMENT ON COLUMN public.sessions.planned_duration_minutes IS
  'Target billable play time in minutes set at session start; used for countdown and extend checks';
