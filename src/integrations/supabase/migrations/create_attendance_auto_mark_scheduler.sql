-- Function to run daily auto-marking (call this via cron or scheduled job)
-- This should be called daily, preferably early morning (e.g., 1 AM)
CREATE OR REPLACE FUNCTION public.run_daily_attendance_auto_mark()
RETURNS void AS $$
BEGIN
  -- Auto-mark missing clock out from previous day
  PERFORM public.auto_mark_missing_clockout();
  
  -- Auto-mark missing clock in for today
  PERFORM public.auto_mark_missing_clockin();
END;
$$ LANGUAGE plpgsql;

-- Note: To set up automatic execution, you can:
-- 1. Use Supabase Cron (pg_cron extension) if available:
--    SELECT cron.schedule('daily-attendance-mark', '0 1 * * *', 'SELECT public.run_daily_attendance_auto_mark()');
--
-- 2. Or use an external cron service to call this function via Supabase REST API
--    or use Supabase Edge Functions with a scheduled trigger

