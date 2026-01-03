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
    -- Mark attendance as leave for each day in the leave period
    v_current_date := v_leave.start_date;
    
    WHILE v_current_date <= v_leave.end_date LOOP
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
          END
        WHERE staff_id = v_leave.staff_id
          AND date = v_current_date;
      ELSE
        -- Create new attendance record for leave
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
          NULL,
          NULL,
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

