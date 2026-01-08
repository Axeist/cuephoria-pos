-- Fix process_regularization to ensure status update works correctly
-- This migration ensures the status is set to the exact values expected by the constraint

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
  v_normalized_action TEXT;
  v_final_status TEXT;
BEGIN
  -- Get regularization request
  SELECT *
  INTO v_reg
  FROM staff_attendance_regularization
  WHERE id = p_regularization_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regularization request not found: %', p_regularization_id;
  END IF;
  
  -- Normalize and validate action (trim whitespace and convert to lowercase)
  v_normalized_action := TRIM(LOWER(p_action));
  
  IF v_normalized_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be "approve" or "reject"', p_action;
  END IF;
  
  -- Determine final status (must match CHECK constraint: 'pending', 'approved', 'rejected')
  IF v_normalized_action = 'approve' THEN
    v_final_status := 'approved';
  ELSIF v_normalized_action = 'reject' THEN
    v_final_status := 'rejected';
  ELSE
    RAISE EXCEPTION 'Invalid normalized action: %', v_normalized_action;
  END IF;
  
  IF v_normalized_action = 'approve' THEN
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
  
  -- Update regularization status using the pre-determined final status
  -- This ensures we're using exactly 'approved' or 'rejected' as required by the CHECK constraint
  UPDATE staff_attendance_regularization
  SET 
    status = v_final_status,
    reviewed_at = now(),
    reviewed_by = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'username',
      'system'
    )
  WHERE id = p_regularization_id;
  
  -- Verify the update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update regularization request status for id: %', p_regularization_id;
  END IF;
  
  -- Double-check the status was set correctly
  SELECT status INTO v_final_status
  FROM staff_attendance_regularization
  WHERE id = p_regularization_id;
  
  IF v_final_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status update failed. Expected approved or rejected, got: %', v_final_status;
  END IF;
END;
$$ LANGUAGE plpgsql;

