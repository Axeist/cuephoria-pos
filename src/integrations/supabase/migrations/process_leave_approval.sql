-- Function to process leave approval and mark attendance as leave
CREATE OR REPLACE FUNCTION public.process_leave_approval(
  p_leave_id UUID,
  p_action TEXT -- 'approve' or 'reject'
)
RETURNS void AS $$
DECLARE
  v_leave RECORD;
  v_current_date DATE;
  v_date_to_process DATE;
  v_shift_start_time TIME;
  v_clock_in_timestamp TIMESTAMP WITH TIME ZONE;
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
    -- Get shift start time for the staff member
    SELECT shift_start_time INTO v_shift_start_time
    FROM staff_profiles
    WHERE user_id = v_leave.staff_id;
    
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
            WHEN v_leave.leave_type = 'paid_leave' THEN 
              (SELECT monthly_salary / EXTRACT(DAY FROM (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE)
               FROM staff_profiles WHERE user_id = v_leave.staff_id)
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
            WHEN v_leave.leave_type = 'paid_leave' THEN 
              (SELECT monthly_salary / EXTRACT(DAY FROM (DATE_TRUNC('month', v_current_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE)
               FROM staff_profiles WHERE user_id = v_leave.staff_id)
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

