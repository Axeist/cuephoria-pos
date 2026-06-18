-- Reports: sessions filtered by start_time within date range
CREATE INDEX IF NOT EXISTS idx_sessions_location_start_time_desc
  ON public.sessions (location_id, start_time DESC);
