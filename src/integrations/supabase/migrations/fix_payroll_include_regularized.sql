-- Fix payroll generation to include regularized attendance records
-- Update the generate_monthly_payroll function to include 'regularized' status
CREATE OR REPLACE FUNCTION public.generate_monthly_payroll(
  p_staff_id UUID,
  p_month INTEGER,
  p_year INTEGER,
  p_admin_username TEXT
)
RETURNS UUID AS $$
DECLARE
  v_payroll_id UUID;
  v_monthly_salary DECIMAL(10, 2);
  v_total_days INTEGER;
  v_total_hours DECIMAL(10, 2);
  v_gross_earnings DECIMAL(10, 2);
  v_total_deductions DECIMAL(10, 2);
  v_total_allowances DECIMAL(10, 2);
  v_net_salary DECIMAL(10, 2);
BEGIN
  SELECT monthly_salary INTO v_monthly_salary
  FROM staff_profiles WHERE user_id = p_staff_id;
  
  -- Count working days: include 'completed' and 'regularized' status, exclude absent/leave
  SELECT 
    COUNT(DISTINCT date),
    COALESCE(SUM(total_working_hours), 0)
  INTO v_total_days, v_total_hours
  FROM staff_attendance
  WHERE staff_id = p_staff_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year
    AND status IN ('completed', 'regularized', 'present', 'half_day', 'half_day_lop')
    AND total_working_hours > 0;
  
  -- Calculate gross earnings from all working days (completed, regularized, present, half_day)
  v_gross_earnings := COALESCE(
    (SELECT SUM(daily_earnings) FROM staff_attendance
     WHERE staff_id = p_staff_id
       AND EXTRACT(MONTH FROM date) = p_month
       AND EXTRACT(YEAR FROM date) = p_year
       AND status IN ('completed', 'regularized', 'present', 'half_day', 'half_day_lop')
       AND daily_earnings > 0), 0
  );
  
  -- Exclude LOP deductions - LOP/leaves are not deductions, just no salary
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
  FROM staff_deductions
  WHERE staff_id = p_staff_id 
    AND month = p_month 
    AND year = p_year
    AND deduction_type != 'lop'; -- Exclude LOP from deductions
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_allowances
  FROM staff_allowances
  WHERE staff_id = p_staff_id AND month = p_month AND year = p_year;
  
  -- Calculate net salary (earnings + allowances - other deductions)
  -- Absent/leave days already have ₹0 earnings, so no need to deduct anything
  v_net_salary := v_gross_earnings + v_total_allowances - v_total_deductions;
  
  INSERT INTO staff_payroll (
    staff_id, month, year, total_working_days, total_working_hours,
    base_salary, gross_earnings, total_deductions, total_allowances,
    net_salary, generated_by
  )
  VALUES (
    p_staff_id, p_month, p_year, v_total_days, v_total_hours,
    v_monthly_salary, v_gross_earnings, v_total_deductions, v_total_allowances,
    v_net_salary, p_admin_username
  )
  ON CONFLICT (staff_id, month, year) 
  DO UPDATE SET
    total_working_days = EXCLUDED.total_working_days,
    total_working_hours = EXCLUDED.total_working_hours,
    gross_earnings = EXCLUDED.gross_earnings,
    total_deductions = EXCLUDED.total_deductions,
    total_allowances = EXCLUDED.total_allowances,
    net_salary = EXCLUDED.net_salary,
    generated_by = EXCLUDED.generated_by,
    generated_at = NOW()
  RETURNING id INTO v_payroll_id;
  
  RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;

-- Update calculate_attendance_earnings to preserve 'regularized' status
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
    -- Don't override status if it's already set to 'regularized' or 'absent_lop'
    IF NEW.status IN ('regularized', 'absent_lop', 'absent', 'half_day_lop') THEN
      -- Just recalculate earnings if needed, but keep the status
      SELECT 
        monthly_salary,
        EXTRACT(EPOCH FROM (shift_end_time - shift_start_time)) / 3600
      INTO v_monthly_salary, v_shift_hours
      FROM staff_profiles 
      WHERE user_id = NEW.staff_id;
      
      IF FOUND AND NEW.status != 'absent_lop' AND NEW.status != 'absent' THEN
        v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', NEW.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
        v_daily_rate := v_monthly_salary / v_days_in_month;
        v_hourly_rate := v_daily_rate / v_shift_hours;
        
        v_actual_hours := GREATEST(
          EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600 - 
          COALESCE(NEW.break_duration_minutes, 0) / 60.0,
          0
        );
        
        v_paid_hours := LEAST(v_actual_hours, v_shift_hours);
        NEW.total_working_hours := v_actual_hours;
        NEW.daily_earnings := v_paid_hours * v_hourly_rate;
      END IF;
      
      RETURN NEW;
    END IF;
    
    -- Original logic for new records
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

