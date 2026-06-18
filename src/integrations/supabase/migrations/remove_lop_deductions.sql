-- Remove LOP deductions - LOP/leaves are not deductions, just no salary for that day
-- This migration removes LOP deduction creation and excludes them from payroll

-- 1. Remove LOP deduction creation from auto_mark_missing_clockout
CREATE OR REPLACE FUNCTION public.auto_mark_missing_clockout()
RETURNS void AS $$
DECLARE
  v_record RECORD;
  v_daily_rate NUMERIC;
  v_half_day_earnings NUMERIC;
  v_staff_profile RECORD;
BEGIN
  -- Find all attendance records from previous day that don't have clock_out
  FOR v_record IN 
    SELECT sa.*
    FROM staff_attendance sa
    WHERE sa.date = CURRENT_DATE - INTERVAL '1 day'
      AND sa.clock_in IS NOT NULL
      AND sa.clock_out IS NULL
      AND sa.status != 'half_day_lop'
  LOOP
    -- Get staff profile for daily rate calculation
    SELECT monthly_salary, 
           EXTRACT(DAY FROM (DATE_TRUNC('month', v_record.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE) as days_in_month
    INTO v_staff_profile
    FROM staff_profiles
    WHERE user_id = v_record.staff_id;
    
    -- Calculate half-day earnings
    v_daily_rate := v_staff_profile.monthly_salary / v_staff_profile.days_in_month;
    v_half_day_earnings := v_daily_rate / 2;
    
    -- Update attendance record - just mark as half day with reduced earnings
    -- NO LOP deduction - it's just no salary for that half day
    UPDATE staff_attendance
    SET 
      clock_out = clock_in + INTERVAL '4 hours', -- Mark as 4 hours worked (half day)
      total_working_hours = 4.0,
      daily_earnings = v_half_day_earnings,
      status = 'half_day_lop',
      notes = COALESCE(notes, '') || ' Auto-marked half-day LOP due to missing clock out.'
    WHERE id = v_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Remove LOP deduction creation from auto_mark_missing_clockin
CREATE OR REPLACE FUNCTION public.auto_mark_missing_clockin()
RETURNS void AS $$
DECLARE
  v_staff RECORD;
BEGIN
  -- For each active staff member, check if they have attendance for today
  FOR v_staff IN 
    SELECT user_id
    FROM staff_profiles
    WHERE is_active = true
  LOOP
    -- Check if staff has attendance record for today
    IF NOT EXISTS (
      SELECT 1 FROM staff_attendance
      WHERE staff_id = v_staff.user_id
        AND date = CURRENT_DATE
    ) THEN
      -- Create absent attendance record with ₹0 earnings
      -- NO LOP deduction - it's just no salary for that day
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
      SELECT 
        v_staff.user_id,
        CURRENT_DATE,
        NULL,
        NULL,
        0,
        0,
        'absent_lop',
        'Auto-marked absent - Missing clock in'
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_attendance
        WHERE staff_id = v_staff.user_id
          AND date = CURRENT_DATE
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Remove LOP deduction removal from process_regularization
-- (LOP deductions shouldn't exist, but remove the code that tries to delete them)
CREATE OR REPLACE FUNCTION public.process_regularization(
  p_regularization_id UUID,
  p_action TEXT -- 'approve' or 'reject'
)
RETURNS void AS $$
DECLARE
  v_reg RECORD;
  v_daily_rate NUMERIC;
  v_half_day_earnings NUMERIC;
  v_staff_profile RECORD;
  v_days_in_month INTEGER;
BEGIN
  -- Get regularization request
  SELECT *
  INTO v_reg
  FROM staff_attendance_regularization
  WHERE id = p_regularization_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regularization request not found';
  END IF;
  
  IF p_action = 'approve' THEN
    -- Get staff profile
    SELECT monthly_salary,
           EXTRACT(DAY FROM (DATE_TRUNC('month', v_reg.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE) as days_in_month
    INTO v_staff_profile
    FROM staff_profiles
    WHERE user_id = v_reg.staff_id;
    
    v_days_in_month := v_staff_profile.days_in_month;
    v_daily_rate := v_staff_profile.monthly_salary / v_days_in_month;
    v_half_day_earnings := v_daily_rate / 2;
    
    IF v_reg.regularization_type = 'missing_clock_in' THEN
      -- Update or create attendance record
      INSERT INTO staff_attendance (
        staff_id,
        date,
        clock_in,
        clock_out,
        total_working_hours,
        daily_earnings,
        status,
        notes
      ) VALUES (
        v_reg.staff_id,
        v_reg.date,
        v_reg.requested_clock_in,
        v_reg.requested_clock_out,
        CASE 
          WHEN v_reg.requested_clock_out IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (v_reg.requested_clock_out - v_reg.requested_clock_in)) / 3600
          ELSE 4.0
        END,
        CASE 
          WHEN v_reg.requested_clock_out IS NOT NULL 
          THEN v_daily_rate
          ELSE v_half_day_earnings
        END,
        'regularized',
        'Regularized attendance - ' || v_reg.reason
      )
      ON CONFLICT (staff_id, date) DO UPDATE
      SET 
        clock_in = v_reg.requested_clock_in,
        clock_out = v_reg.requested_clock_out,
        total_working_hours = CASE 
          WHEN v_reg.requested_clock_out IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (v_reg.requested_clock_out - v_reg.requested_clock_in)) / 3600
          ELSE 4.0
        END,
        daily_earnings = CASE 
          WHEN v_reg.requested_clock_out IS NOT NULL 
          THEN v_daily_rate
          ELSE v_half_day_earnings
        END,
        status = 'regularized',
        notes = 'Regularized attendance - ' || v_reg.reason;
        
    ELSIF v_reg.regularization_type = 'missing_clock_out' THEN
      -- Update attendance record
      UPDATE staff_attendance
      SET 
        clock_out = v_reg.requested_clock_out,
        total_working_hours = EXTRACT(EPOCH FROM (v_reg.requested_clock_out - clock_in)) / 3600,
        daily_earnings = v_daily_rate,
        status = 'regularized',
        notes = COALESCE(notes, '') || ' Regularized - ' || v_reg.reason
      WHERE staff_id = v_reg.staff_id
        AND date = v_reg.date;
        
    ELSIF v_reg.regularization_type = 'apply_leave' THEN
      -- Create leave request (only if doesn't exist)
      INSERT INTO staff_leave_requests (
        staff_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status
      )
      SELECT 
        v_reg.staff_id,
        v_reg.requested_leave_type,
        v_reg.date,
        v_reg.date,
        v_reg.reason,
        'approved'
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_leave_requests
        WHERE staff_id = v_reg.staff_id
          AND start_date = v_reg.date
          AND end_date = v_reg.date
      );
      
      -- Update attendance to leave status with ₹0 earnings
      INSERT INTO staff_attendance (
        staff_id,
        date,
        clock_in,
        clock_out,
        total_working_hours,
        daily_earnings,
        status,
        notes
      ) VALUES (
        v_reg.staff_id,
        v_reg.date,
        NULL,
        NULL,
        0,
        0,
        'leave',
        'Leave applied - ' || v_reg.reason
      )
      ON CONFLICT (staff_id, date) DO UPDATE
      SET 
        status = 'leave',
        daily_earnings = 0,
        total_working_hours = 0,
        notes = 'Leave applied - ' || v_reg.reason;
    END IF;
    
    -- Update regularization status
    UPDATE staff_attendance_regularization
    SET 
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username'
    WHERE id = p_regularization_id;
  ELSE
    -- Reject regularization
    UPDATE staff_attendance_regularization
    SET 
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username'
    WHERE id = p_regularization_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Update payroll to exclude LOP deductions
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

-- 5. Optional: Delete all existing LOP deductions (uncomment if you want to clean up)
-- DELETE FROM staff_deductions WHERE deduction_type = 'lop';

