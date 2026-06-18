-- Update attendance auto-mark logic:
-- 1. Mark as absent only if clock in doesn't happen within 2 hours of shift end time
-- 2. Mark as absent if clock out is forgotten and not clocked out within 5 hours of shift end time
-- 3. Allow early login but ensure the entire shift duration is completed

-- 1. Update auto_mark_missing_clockout to check 5 hours after shift end
CREATE OR REPLACE FUNCTION public.auto_mark_missing_clockout()
RETURNS void AS $$
DECLARE
  v_record RECORD;
  v_daily_rate NUMERIC;
  v_half_day_earnings NUMERIC;
  v_staff_profile RECORD;
  v_shift_end_datetime TIMESTAMP WITH TIME ZONE;
  v_five_hours_after_shift_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find all attendance records from previous day that don't have clock_out
  -- Only mark as absent if 5 hours have passed since shift end time
  FOR v_record IN 
    SELECT sa.*, sp.shift_end_time
    FROM staff_attendance sa
    JOIN staff_profiles sp ON sa.staff_id = sp.user_id
    WHERE sa.date = CURRENT_DATE - INTERVAL '1 day'
      AND sa.clock_in IS NOT NULL
      AND sa.clock_out IS NULL
      AND sa.status NOT IN ('half_day_lop', 'absent_lop', 'absent')
  LOOP
    -- Calculate shift end datetime for the attendance date
    v_shift_end_datetime := (v_record.date::timestamp + v_record.shift_end_time::interval)::timestamp with time zone;
    v_five_hours_after_shift_end := v_shift_end_datetime + INTERVAL '5 hours';
    
    -- Only mark as absent if current time is past 5 hours after shift end
    IF NOW() >= v_five_hours_after_shift_end THEN
      -- Get staff profile for daily rate calculation
      SELECT monthly_salary, 
             EXTRACT(DAY FROM (DATE_TRUNC('month', v_record.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE) as days_in_month
      INTO v_staff_profile
      FROM staff_profiles
      WHERE user_id = v_record.staff_id;
      
      -- Calculate half-day earnings
      v_daily_rate := v_staff_profile.monthly_salary / v_staff_profile.days_in_month;
      v_half_day_earnings := v_daily_rate / 2;
      
      -- Mark as absent (not half day) since clock out was forgotten
      UPDATE staff_attendance
      SET 
        clock_out = v_shift_end_datetime, -- Set clock out to shift end time
        total_working_hours = EXTRACT(EPOCH FROM (v_shift_end_datetime - v_record.clock_in)) / 3600,
        daily_earnings = CASE 
          WHEN EXTRACT(EPOCH FROM (v_shift_end_datetime - v_record.clock_in)) / 3600 >= (EXTRACT(EPOCH FROM (v_record.shift_end_time::interval - '00:00:00'::time::interval)) / 3600) * 0.5
          THEN v_daily_rate
          ELSE v_half_day_earnings
        END,
        status = 'absent_lop',
        notes = COALESCE(notes, '') || ' Auto-marked absent - Missing clock out (5 hours after shift end).'
      WHERE id = v_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Update auto_mark_missing_clockin to check 2 hours after shift end
CREATE OR REPLACE FUNCTION public.auto_mark_missing_clockin()
RETURNS void AS $$
DECLARE
  v_staff RECORD;
  v_shift_end_datetime TIMESTAMP WITH TIME ZONE;
  v_two_hours_after_shift_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- For each active staff member, check if they have attendance for today
  FOR v_staff IN 
    SELECT user_id, shift_end_time
    FROM staff_profiles
    WHERE is_active = true
  LOOP
    -- Calculate shift end datetime for today
    v_shift_end_datetime := (CURRENT_DATE::timestamp + v_staff.shift_end_time::interval)::timestamp with time zone;
    v_two_hours_after_shift_end := v_shift_end_datetime + INTERVAL '2 hours';
    
    -- Only mark as absent if:
    -- 1. No attendance record exists for today, AND
    -- 2. Current time is past 2 hours after shift end time
    IF NOT EXISTS (
      SELECT 1 FROM staff_attendance
      WHERE staff_id = v_staff.user_id
        AND date = CURRENT_DATE
    ) AND NOW() >= v_two_hours_after_shift_end THEN
      -- Create absent attendance record with ₹0 earnings
      INSERT INTO staff_attendance (
        staff_id,
        date,
        clock_in,
        clock_out,
        total_working_hours,
        daily_earnings,
        status,
        notes
      )
      VALUES (
        v_staff.user_id,
        CURRENT_DATE,
        NULL,
        NULL,
        0,
        0,
        'absent_lop',
        'Auto-marked absent - Missing clock in (2 hours after shift end)'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Update calculate_attendance_earnings to ensure full shift duration is completed
-- Allow early login but calculate earnings based on actual shift duration requirement
CREATE OR REPLACE FUNCTION public.calculate_attendance_earnings()
RETURNS TRIGGER AS $$
DECLARE
  v_monthly_salary DECIMAL(10, 2);
  v_days_in_month INTEGER;
  v_daily_rate DECIMAL(10, 2);
  v_shift_hours DECIMAL(5, 2);
  v_actual_hours DECIMAL(5, 2);
  v_earned_hours DECIMAL(5, 2);
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
    
    -- Calculate actual working hours (excluding breaks)
    v_actual_hours := GREATEST(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600 - 
      COALESCE(NEW.break_duration_minutes, 0) / 60.0,
      0
    );
    
    -- Allow early login, but ensure the entire shift duration is completed
    -- Calculate earned hours: actual hours worked (excluding breaks)
    v_earned_hours := v_actual_hours;
    
    -- Ensure minimum shift duration is met
    -- If they worked less than required shift hours, prorate earnings
    IF v_earned_hours < v_shift_hours THEN
      -- Prorate earnings based on hours worked vs required hours
      NEW.total_working_hours := v_earned_hours;
      NEW.daily_earnings := (v_earned_hours / v_shift_hours) * v_daily_rate;
      
      -- Mark as half day if less than 50% of shift completed
      IF v_earned_hours < (v_shift_hours * 0.5) THEN
        NEW.status := 'half_day_lop';
      ELSE
        NEW.status := 'half_day';
      END IF;
    ELSE
      -- Full shift duration completed - pay full daily rate
      -- Cap working hours at shift hours to prevent over-payment for early login
      NEW.total_working_hours := LEAST(v_earned_hours, v_shift_hours);
      NEW.daily_earnings := v_daily_rate;
      NEW.status := 'completed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

