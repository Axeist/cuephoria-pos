-- Fix: double shift approval should add a fixed ₹200 allowance
-- This overrides the previous computed allowance behavior.

CREATE OR REPLACE FUNCTION public.process_double_shift_request(
  p_request_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_remarks TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_request RECORD;
  v_allowance NUMERIC := 200;
BEGIN
  -- Get double shift request
  SELECT *
  INTO v_request
  FROM staff_double_shift_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Double shift request not found';
  END IF;

  IF p_action = 'approve' THEN
    -- Update request status + store allowance
    UPDATE staff_double_shift_requests
    SET
      status = 'approved',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username',
      allowance_amount = v_allowance
    WHERE id = p_request_id;

    -- Add fixed allowance to payroll
    INSERT INTO staff_allowances (
      staff_id,
      allowance_type,
      amount,
      reason,
      approved_by,
      month,
      year
    ) VALUES (
      v_request.staff_id,
      'double_shift',
      v_allowance,
      'Double shift allowance (fixed ₹200) - Covered for ' ||
      (SELECT username FROM staff_profiles WHERE user_id = v_request.covered_staff_id) ||
      ' on ' || v_request.date || ' (' || v_request.total_hours || ' hours)',
      current_setting('request.jwt.claims', true)::json->>'username',
      EXTRACT(MONTH FROM v_request.date)::INTEGER,
      EXTRACT(YEAR FROM v_request.date)::INTEGER
    );
  ELSE
    -- Reject request
    UPDATE staff_double_shift_requests
    SET
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = current_setting('request.jwt.claims', true)::json->>'username',
      remarks = p_remarks
    WHERE id = p_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

