-- Fix process_regularization to remove ON CONFLICT clause (no unique constraint exists)
-- Fix process_leave_approval to ensure attendance records are created correctly

-- 1. Fix process_regularization function
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
  
  -- Validate action
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be "approve" or "reject"', p_action;
  END IF;
  
  IF p_action = 'approve' THEN
    -- Get staff profile
    SELECT monthly_salary,
           EXTRACT(DAY FROM (DATE_TRUNC('month', v_reg.date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE) as days_in_month
    INTO v_staff_profile
    FROM staff_profiles
    WHERE user_id = v_reg.staff_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Staff profile not found for staff_id: %', v_reg.staff_id;
    END IF;
    
    IF v_staff_profile.monthly_salary IS NULL THEN
      RAISE EXCEPTION 'Monthly salary not set for staff_id: %', v_reg.staff_id;
    END IF;
    
    v_days_in_month := v_staff_profile.days_in_month;
    IF v_days_in_month IS NULL OR v_days_in_month = 0 THEN
      v_days_in_month := 30; -- Default to 30 days if calculation fails
    END IF;
    
    v_daily_rate := v_staff_profile.monthly_salary / v_days_in_month;
    v_half_day_earnings := v_daily_rate / 2;
    
    IF v_reg.regularization_type = 'missing_clock_in' THEN
      -- Check if attendance record exists, then update or insert
      IF EXISTS (
        SELECT 1 FROM staff_attendance
        WHERE staff_id = v_reg.staff_id
          AND date = v_reg.date
      ) THEN
        -- Update existing attendance record
        UPDATE staff_attendance
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
          notes = COALESCE(notes, '') || ' Regularized attendance - ' || v_reg.reason
        WHERE staff_id = v_reg.staff_id
          AND date = v_reg.date;
      ELSE
        -- Create new attendance record
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
        );
      END IF;
        
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
      IF EXISTS (
        SELECT 1 FROM staff_attendance
        WHERE staff_id = v_reg.staff_id
          AND date = v_reg.date
      ) THEN
        UPDATE staff_attendance
        SET 
          status = 'leave',
          notes = COALESCE(notes, '') || ' Leave applied - ' || v_reg.leave_type
        WHERE staff_id = v_reg.staff_id
          AND date = v_reg.date;
      ELSE
        -- Create leave attendance record
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
          v_reg.staff_id,
          v_reg.date,
          (v_reg.date::timestamp + COALESCE(sp.shift_start_time, '09:00:00'::time)::interval)::timestamp with time zone,
          (v_reg.date::timestamp + COALESCE(sp.shift_start_time, '09:00:00'::time)::interval)::timestamp with time zone,
          0,
          0,
          'leave',
          'Leave applied - ' || v_reg.leave_type
        FROM staff_profiles sp
        WHERE sp.user_id = v_reg.staff_id;
      END IF;
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

-- 2. Ensure process_leave_approval creates attendance records correctly
CREATE OR REPLACE FUNCTION public.process_leave_approval(
  p_leave_id UUID,
  p_action TEXT -- 'approve' or 'reject'
)
RETURNS void AS $$
DECLARE
  v_leave RECORD;
  v_current_date DATE;
  v_shift_start_time TIME;
  v_clock_in_timestamp TIMESTAMP WITH TIME ZONE;
  v_daily_rate NUMERIC;
  v_days_in_month INTEGER;
BEGIN
  -- Get leave request
  SELECT *
  INTO v_leave
  FROM staff_leave_requests
  WHERE id = p_leave_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;
  
  IF p_action = 'approve' THEN
    -- Get shift start time and daily rate for the staff member
    SELECT shift_start_time,
           monthly_salary,
           EXTRACT(DAY FROM (DATE_TRUNC('month', v_leave.start_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE) as days_in_month
    INTO v_shift_start_time, v_daily_rate, v_days_in_month
    FROM staff_profiles
    WHERE user_id = v_leave.staff_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Staff profile not found for staff_id: %', v_leave.staff_id;
    END IF;
    
    IF v_days_in_month IS NULL OR v_days_in_month = 0 THEN
      v_days_in_month := 30; -- Default to 30 days if calculation fails
    END IF;
    
    IF v_daily_rate IS NULL THEN
      v_daily_rate := 0;
    ELSE
      v_daily_rate := v_daily_rate / v_days_in_month;
    END IF;
    
    -- Mark attendance as leave for each day in the leave period
    v_current_date := v_leave.start_date;
    
    WHILE v_current_date <= v_leave.end_date LOOP
      -- Calculate clock_in timestamp using shift start time (required field)
      v_clock_in_timestamp := (v_current_date::timestamp + COALESCE(v_shift_start_time, '09:00:00'::time)::interval)::timestamp with time zone;
      
      -- Check if attendance record exists
      IF EXISTS (
        SELECT 1 FROM staff_attendance 
        WHERE staff_id = v_leave.staff_id 
        AND date = v_current_date
      ) THEN
        -- Update existing attendance record
        UPDATE staff_attendance
        SET 
          status = 'leave',
          notes = COALESCE(notes, '') || ' Approved leave: ' || v_leave.leave_type,
          daily_earnings = CASE 
            WHEN v_leave.leave_type = 'paid_leave' THEN v_daily_rate
            ELSE 0
          END,
          -- Set clock_in and clock_out to same time to indicate leave (no actual work)
          clock_in = COALESCE(clock_in, v_clock_in_timestamp),
          clock_out = COALESCE(clock_out, v_clock_in_timestamp),
          total_working_hours = 0
        WHERE staff_id = v_leave.staff_id
          AND date = v_current_date;
      ELSE
        -- Create new attendance record for leave
        -- Use shift start time for clock_in (required field) and same time for clock_out
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
          v_leave.staff_id,
          v_current_date,
          v_clock_in_timestamp,
          v_clock_in_timestamp, -- Same as clock_in to indicate no actual work
          0,
          CASE 
            WHEN v_leave.leave_type = 'paid_leave' THEN v_daily_rate
            ELSE 0
          END,
          'leave',
          'Approved leave: ' || v_leave.leave_type
        );
      END IF;
      
      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END IF;
  
  -- Update leave request status
  UPDATE staff_leave_requests
  SET 
    status = p_action,
    reviewed_at = NOW()
  WHERE id = p_leave_id;
END;
$$ LANGUAGE plpgsql;

