-- Update attendance earnings calculation to NOT pay for overtime hours
-- Only pay for shift hours, overtime is tracked separately
CREATE OR REPLACE FUNCTION public.calculate_attendance_earnings()
RETURNS TRIGGER AS $$
DECLARE
  v_monthly_salary DECIMAL(10, 2);
  v_days_in_month INTEGER;
  v_daily_rate DECIMAL(10, 2);
  v_hourly_rate DECIMAL(10, 2);
  v_shift_hours DECIMAL(5, 2);
  v_actual_hours DECIMAL(5, 2);
  v_paid_hours DECIMAL(5, 2);
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    SELECT 
      monthly_salary,
      EXTRACT(EPOCH FROM (shift_end_time - shift_start_time)) / 3600
    INTO v_monthly_salary, v_shift_hours
    FROM staff_profiles 
    WHERE user_id = NEW.staff_id;
    
    v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', NEW.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
    v_daily_rate := v_monthly_salary / v_days_in_month;
    v_hourly_rate := v_daily_rate / v_shift_hours;
    
    -- Calculate actual working hours (excluding breaks)
    v_actual_hours := GREATEST(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600 - 
      COALESCE(NEW.break_duration_minutes, 0) / 60.0,
      0
    );
    
    -- IMPORTANT: Only pay for shift hours, not overtime
    -- Cap the paid hours at shift hours
    v_paid_hours := LEAST(v_actual_hours, v_shift_hours);
    
    NEW.total_working_hours := v_actual_hours; -- Store actual hours for tracking
    NEW.daily_earnings := v_paid_hours * v_hourly_rate; -- Only pay for shift hours
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

