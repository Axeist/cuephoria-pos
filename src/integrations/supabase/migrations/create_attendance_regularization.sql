-- Create attendance regularization requests table
CREATE TABLE IF NOT EXISTS public.staff_attendance_regularization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  regularization_type TEXT NOT NULL CHECK (regularization_type IN ('missing_clock_in', 'missing_clock_out', 'apply_leave')),
  requested_clock_in TIMESTAMP WITH TIME ZONE,
  requested_clock_out TIMESTAMP WITH TIME ZONE,
  leave_type TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_regularization_unique 
ON public.staff_attendance_regularization(staff_id, date, regularization_type) 
WHERE status = 'pending';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_regularization_staff_date ON public.staff_attendance_regularization(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_regularization_status ON public.staff_attendance_regularization(status);

-- Function to auto-mark half-day LOP for missing clock out
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
    
    -- Update attendance record
    UPDATE staff_attendance
    SET 
      clock_out = clock_in + INTERVAL '4 hours', -- Mark as 4 hours worked (half day)
      total_working_hours = 4.0,
      daily_earnings = v_half_day_earnings,
      status = 'half_day_lop',
      notes = COALESCE(notes, '') || ' Auto-marked half-day LOP due to missing clock out.'
    WHERE id = v_record.id;
    
      -- Create LOP deduction (only if doesn't exist for this date)
      INSERT INTO staff_deductions (
        staff_id,
        deduction_type,
        amount,
        reason,
        deduction_date,
        marked_by,
        month,
        year
      )
      SELECT 
        v_record.staff_id,
        'lop',
        v_half_day_earnings,
        'Half-day LOP - Missing clock out on ' || v_record.date,
        v_record.date,
        'system',
        EXTRACT(MONTH FROM v_record.date)::INTEGER,
        EXTRACT(YEAR FROM v_record.date)::INTEGER
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_deductions
        WHERE staff_id = v_record.staff_id
          AND deduction_date = v_record.date
          AND deduction_type = 'lop'
          AND marked_by = 'system'
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-mark absent/LOP for missing clock in
CREATE OR REPLACE FUNCTION public.auto_mark_missing_clockin()
RETURNS void AS $$
DECLARE
  v_staff RECORD;
  v_daily_rate NUMERIC;
  v_days_in_month INTEGER;
BEGIN
  -- For each active staff member, check if they have attendance for today
  FOR v_staff IN 
    SELECT user_id, monthly_salary
    FROM staff_profiles
    WHERE is_active = true
  LOOP
    -- Check if staff has attendance record for today
    IF NOT EXISTS (
      SELECT 1 FROM staff_attendance
      WHERE staff_id = v_staff.user_id
        AND date = CURRENT_DATE
    ) THEN
      -- Calculate daily rate
      v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE);
      v_daily_rate := v_staff.monthly_salary / v_days_in_month;
      
      -- Create absent attendance record (only if doesn't exist)
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
      
      -- Create LOP deduction (only if doesn't exist for this date)
      INSERT INTO staff_deductions (
        staff_id,
        deduction_type,
        amount,
        reason,
        deduction_date,
        marked_by,
        month,
        year
      )
      SELECT 
        v_staff.user_id,
        'lop',
        v_daily_rate,
        'Full-day LOP - Missing clock in on ' || CURRENT_DATE,
        CURRENT_DATE,
        'system',
        EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_deductions
        WHERE staff_id = v_staff.user_id
          AND deduction_date = CURRENT_DATE
          AND deduction_type = 'lop'
          AND marked_by = 'system'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check regularization limit (3 per month)
CREATE OR REPLACE FUNCTION public.check_regularization_limit(
  p_staff_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM staff_attendance_regularization
  WHERE staff_id = p_staff_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year
    AND status IN ('pending', 'approved');
  
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql;

-- Function to process approved regularization
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
      
      -- Remove LOP deduction if exists
      DELETE FROM staff_deductions
      WHERE staff_id = v_reg.staff_id
        AND deduction_type = 'lop'
        AND deduction_date = v_reg.date
        AND marked_by = 'system';
        
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
      
      -- Remove half-day LOP deduction
      DELETE FROM staff_deductions
      WHERE staff_id = v_reg.staff_id
        AND deduction_type = 'lop'
        AND deduction_date = v_reg.date
        AND marked_by = 'system';
        
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
        v_reg.leave_type,
        v_reg.date,
        v_reg.date,
        v_reg.reason,
        'approved' -- Auto-approve since admin already approved regularization
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_leave_requests
        WHERE staff_id = v_reg.staff_id
          AND start_date = v_reg.date
          AND end_date = v_reg.date
      );
      
      -- Update attendance to show leave
      UPDATE staff_attendance
      SET 
        status = 'leave',
        notes = COALESCE(notes, '') || ' Leave applied - ' || v_reg.leave_type
      WHERE staff_id = v_reg.staff_id
        AND date = v_reg.date;
      
      -- Remove LOP deduction
      DELETE FROM staff_deductions
      WHERE staff_id = v_reg.staff_id
        AND deduction_type = 'lop'
        AND deduction_date = v_reg.date
        AND marked_by = 'system';
    END IF;
  END IF;
  
  -- Update regularization status
  UPDATE staff_attendance_regularization
  SET 
    status = p_action,
    reviewed_at = now(),
    reviewed_by = current_setting('request.jwt.claims', true)::json->>'username'
  WHERE id = p_regularization_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for regularization requests with staff info
CREATE OR REPLACE VIEW public.pending_regularization_view AS
SELECT 
  sar.*,
  sp.username,
  sp.full_name,
  sp.designation
FROM staff_attendance_regularization sar
JOIN staff_profiles sp ON sar.staff_id = sp.user_id
WHERE sar.status = 'pending'
ORDER BY sar.date DESC, sar.created_at DESC;

